import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import axios from 'axios';
import OpenAI from 'openai';
import {
  searchByPhone,
  createContactWithLead,
  postNote,
  createTask,
  updateLeadTags,
  updateContactName,
  updateLeadName,
  getResponsibleUser,
} from './amocrm.js';
import { analyzeTranscript } from './analyze.js';
import {
  findOrCreateClient,
  findManagerByPbxUser,
  createCall,
  updateCall,
  saveEvaluation,
  saveCallInsights,
  updateClientProfile,
  updateClientAmoContactId,
  incrementClientCalls,
  getPreviousCallSummaries,
  uploadAudio,
} from './supabase.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CALL_TYPE_LABEL = { in: 'Входящий', out: 'Исходящий' };

/** Cached responsible user ID */
let cachedResponsibleUserId = null;

async function getResponsibleUserId() {
  if (cachedResponsibleUserId) return cachedResponsibleUserId;
  try {
    cachedResponsibleUserId = await getResponsibleUser();
    console.log(`[AMO] Ответственный пользователь: #${cachedResponsibleUserId}`);
  } catch (err) {
    console.error('[AMO] Не удалось получить пользователя:', err.message);
  }
  return cachedResponsibleUserId;
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}м ${s}с` : `${s}с`;
}

/**
 * Build the CRM note: header + summary + evaluation.
 */
function buildNoteText(meta, analysis) {
  const typeLabel = CALL_TYPE_LABEL[meta.type] ?? meta.type;
  const durationStr = formatDuration(Number(meta.duration));
  const eval_ = analysis.evaluation;

  const lines = [
    `📞 ${typeLabel} звонок | ${durationStr} | ${meta.phone}`,
    `🆔 Call ID: ${meta.callid}`,
    '',
    analysis.summary,
    '',
    `📊 Оценка менеджера: ${eval_.score_total}/10`,
    `   Приветствие: ${eval_.score_greeting} | Потребности: ${eval_.score_needs} | Презентация: ${eval_.score_presentation} | Возражения: ${eval_.score_objections} | Закрытие: ${eval_.score_closing}`,
    '',
    `💡 Рекомендации:`,
    eval_.recommendations,
  ];

  return lines.join('\n');
}

async function downloadMp3(url, callid) {
  const tmpPath = path.join('/tmp', `call_${callid}_${Date.now()}.mp3`);
  const writer = fs.createWriteStream(tmpPath);
  const response = await axios.get(url, { responseType: 'stream', timeout: 60_000 });
  await pipeline(response.data, writer);
  return tmpPath;
}

async function transcribeAudio(filePath) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-1',
    language: 'ru',
  });
  return transcription.text;
}

/**
 * Express route handler for POST /webhook
 */
export async function handleWebhook(req, res) {
  const { type, status, phone, link, callid, duration, crm_token, user, ext, telnum } = req.body;

  // ── Validate ──────────────────────────────────────────────────────────────
  if (crm_token !== process.env.PBX_CRM_TOKEN) {
    console.warn(`[WEBHOOK] Неверный crm_token`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log(`[WEBHOOK] callid=${callid} status=${status} duration=${duration} type=${type} phone=${phone}`);

  const durationNum = Number(duration);
  if (status !== 'Success' || durationNum < 10 || !link) {
    console.log(`[WEBHOOK] Пропуск: status=${status}, duration=${durationNum}, link=${!!link}`);
    return res.status(200).json({ ok: true });
  }

  // Respond immediately
  res.status(200).json({ ok: true });

  const meta = { type, duration: durationNum, phone, callid };
  let tmpPath = null;

  try {
    // ── Client phone comes directly from Moldcell "phone" field ────────────
    const clientPhone = phone;

    // ── Find/create client in Supabase ───────────────────────────────────────
    const client = await findOrCreateClient(clientPhone);
    console.log(`[DB] Клиент: ${client.id} (${clientPhone})`);

    // ── Find manager by PBX user login ───────────────────────────────────────
    let manager = null;
    if (user) {
      manager = await findManagerByPbxUser(user);
      if (manager) {
        console.log(`[DB] Менеджер: ${manager.name} (pbx_user=${user})`);
      } else {
        console.warn(`[DB] Менеджер не найден: pbx_user="${user}" ext=${ext} telnum=${telnum}`);
      }
    }

    // ── Create call record (status: processing) ─────────────────────────────
    const callRecord = await createCall({
      callid,
      manager_id: manager?.id ?? null,
      client_id: client.id,
      type,
      duration: durationNum,
      status: 'processing',
      amo_lead_id: null,
    });
    console.log(`[DB] Звонок создан: ${callRecord.id}`);

    // ── Download MP3 ─────────────────────────────────────────────────────────
    console.log(`[WEBHOOK] Скачиваю запись...`);
    tmpPath = await downloadMp3(link, callid);

    // ── Upload to Supabase Storage ───────────────────────────────────────────
    let audioPath = null;
    try {
      audioPath = await uploadAudio(tmpPath, callid);
      await updateCall(callRecord.id, { audio_path: audioPath });
      console.log(`[DB] Аудио загружено: ${audioPath}`);
    } catch (uploadErr) {
      console.error(`[DB] Ошибка загрузки аудио:`, uploadErr.message);
    }

    // ── Transcribe ───────────────────────────────────────────────────────────
    let transcript = '';
    try {
      console.log('[WEBHOOK] Транскрибирую...');
      transcript = await transcribeAudio(tmpPath);
      await updateCall(callRecord.id, { transcript });
      console.log(`[WEBHOOK] Транскрипция: ${transcript.length} символов`);
    } catch (whisperErr) {
      console.error(`[WEBHOOK] Ошибка Whisper:`, whisperErr.message);
      await updateCall(callRecord.id, { status: 'failed' });
      return;
    }

    // ── Get context for analysis ─────────────────────────────────────────────
    const previousSummaries = await getPreviousCallSummaries(client.id);

    // ── Analyse with Claude ──────────────────────────────────────────────────
    console.log('[WEBHOOK] Анализирую (Claude)...');
    const analysis = await analyzeTranscript(transcript, client, previousSummaries);
    console.log(`[WEBHOOK] Анализ: name=${analysis.client_name} score=${analysis.evaluation.score_total} tags=${analysis.tags.join(', ')}`);

    // ── Save evaluation ──────────────────────────────────────────────────────
    if (manager) {
      try {
        await saveEvaluation({
          call_id: callRecord.id,
          manager_id: manager.id,
          score_greeting: analysis.evaluation.score_greeting,
          score_needs: analysis.evaluation.score_needs,
          score_presentation: analysis.evaluation.score_presentation,
          score_objections: analysis.evaluation.score_objections,
          score_closing: analysis.evaluation.score_closing,
          score_total: analysis.evaluation.score_total,
          recommendations: analysis.evaluation.recommendations,
          raw_analysis: analysis,
        });
        console.log(`[DB] Оценка сохранена`);
      } catch (evalErr) {
        console.error(`[DB] Ошибка сохранения оценки:`, evalErr.message);
      }
    }

    // ── Save call insights ───────────────────────────────────────────────────
    try {
      await saveCallInsights({
        call_id: callRecord.id,
        client_id: client.id,
        extracted_name: analysis.client_name,
        extracted_property: analysis.client_insights.desired_property,
        extracted_budget: analysis.client_insights.budget,
        extracted_concerns: analysis.client_insights.concerns,
        extracted_source: analysis.client_insights.source,
        extracted_timeline: analysis.client_insights.timeline,
        extracted_notes: analysis.client_insights.notes,
      });
      console.log(`[DB] Insights сохранены`);
    } catch (insErr) {
      console.error(`[DB] Ошибка сохранения insights:`, insErr.message);
    }

    // ── Update client profile ────────────────────────────────────────────────
    try {
      await updateClientProfile(client.id, analysis.client_insights, analysis.client_name);
      await incrementClientCalls(client.id);
      console.log(`[DB] Профиль клиента обновлён`);
    } catch (clientErr) {
      console.error(`[DB] Ошибка обновления профиля:`, clientErr.message);
    }

    // ── Mark call as completed ───────────────────────────────────────────────
    await updateCall(callRecord.id, { status: 'completed' });

    // ── AmoCRM integration ───────────────────────────────────────────────────
    const noteText = buildNoteText(meta, analysis);

    console.log(`[AMO] Ищу контакт: ${clientPhone}`);
    let amoResult = null;
    try {
      amoResult = await searchByPhone(clientPhone);
      if (!amoResult) {
        console.log(`[AMO] Контакт не найден, создаю...`);
        amoResult = await createContactWithLead(clientPhone);
      }
    } catch (amoErr) {
      console.error(`[AMO] Ошибка:`, amoErr.message);
    }

    if (!amoResult) {
      console.warn(`[AMO] Нет данных — пропускаем AmoCRM.`);
      return;
    }

    const { contactId, leadId } = amoResult;

    // Save AMO lead ID to call record
    if (leadId) {
      await updateCall(callRecord.id, { amo_lead_id: leadId }).catch(() => {});
    }

    // Save AMO contact ID to client
    if (contactId && !client.amo_contact_id) {
      try {
        await updateClientAmoContactId(client.id, contactId);
      } catch (e) {
        console.error(`[DB] Ошибка сохранения amo_contact_id:`, e.message);
      }
    }

    // Post note
    try {
      const entityType = leadId ? 'leads' : 'contacts';
      const entityId = leadId ?? contactId;
      await postNote(entityType, entityId, noteText);
      console.log(`[AMO] Заметка в ${entityType} #${entityId}`);
    } catch (noteErr) {
      console.error(`[AMO] Ошибка заметки:`, noteErr.message);
    }

    // Update contact name
    if (analysis.client_name && contactId) {
      await updateContactName(contactId, analysis.client_name).catch((e) =>
        console.error(`[AMO] Ошибка имени контакта:`, e.message)
      );
    }

    // Update lead name
    if (analysis.client_name && leadId) {
      await updateLeadName(leadId, `${analysis.client_name} ${clientPhone}`).catch((e) =>
        console.error(`[AMO] Ошибка имени сделки:`, e.message)
      );
    }

    // Tags
    if (analysis.tags.length > 0 && leadId) {
      await updateLeadTags(leadId, analysis.tags).catch((e) =>
        console.error(`[AMO] Ошибка тегов:`, e.message)
      );
    }

    // Follow-up task
    if (analysis.has_next_step && analysis.next_step_text && leadId) {
      try {
        const responsibleUserId = await getResponsibleUserId();
        if (responsibleUserId) {
          await createTask(leadId, responsibleUserId, analysis.next_step_text, analysis.next_step_deadline_days);
          console.log(`[AMO] Задача создана`);
        }
      } catch (taskErr) {
        console.error(`[AMO] Ошибка задачи:`, taskErr.message);
      }
    }

    console.log(`[WEBHOOK] ✅ Звонок ${callid} обработан полностью`);
  } catch (err) {
    console.error(`[WEBHOOK] Критическая ошибка (callid=${callid}):`, err.message);
  } finally {
    if (tmpPath) {
      fs.unlink(tmpPath, (err) => {
        if (err) console.warn(`[WEBHOOK] Temp не удалён:`, err.message);
      });
    }
  }
}