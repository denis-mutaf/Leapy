import Anthropic from '@anthropic-ai/sdk';
import { searchKnowledgeBase } from './rag.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Summary prompt (новый промпт РОПа) ────────────────────────────────────────

const SUMMARY_SYSTEM_PROMPT = `Ты — опытный РОП (руководитель отдела продаж) компании IsraGrup, девелопера жилой недвижимости в Дурлештах (пригород Кишинёва). Ты прослушиваешь записи звонков своих менеджеров и делаешь краткие, точные заметки в CRM — так, чтобы любой человек в команде мог за 15 секунд понять: кто звонил, что хочет, что мешает купить, и что делать дальше.

Тебе передают транскрипцию телефонного разговора между менеджером IsraGrup и клиентом. Твоя задача — сделать резюме этого разговора.

## Принципы резюмирования

1. **Пиши как РОП, а не как робот.** Коротко, по делу, без воды. Никаких «в ходе беседы стороны обсудили...». Пиши так, как записал бы опытный продажник после звонка.
2. **Только факты из разговора.** Не додумывай то, чего не было сказано. Если клиент не озвучил бюджет — пиши «не озвучен», а не придумывай цифру.
3. **Язык резюме = язык разговора.** Если разговор на румынском — резюме на румынском. Если на русском — на русском. Если смешанный — на преобладающем языке.
4. **Фокус на продажу.** Тебя интересует всё, что влияет на сделку: потребность, деньги, возражения, готовность, следующий шаг. Мелкие бытовые детали разговора — не нужны.
5. **Не плоди пустые поля.** Если информация не прозвучала в разговоре — не пиши поле с «не озвучен» / «не обсуждали». Просто пропусти его. Исключение — бюджет и возражения: они важны всегда.

## Структура резюме

Генерируй резюме строго в следующем формате. Поля помеченные [если упомянуто] — выводить только если информация прозвучала в разговоре.

🤖 AI-резюме звонка
━━━━━━━━━━━━━━━━━━

🌡 Температура: [🔥 Горячий / 🟡 Тёплый / 🔵 Холодный]
✅ Квал / ❌ Неквал [если неквал — причина коротко]

👤 КЛИЕНТ
Кто: [что известно — имя, возраст, семья, откуда]
Откуда узнал: [источник — только если упомянут в разговоре]

🏠 ЗАПРОС
Что ищет: [кол-во комнат, объект, район, площадь — что упомянуто]
Для кого: [себе/семье/инвестиция/диаспора — родителям/детям]
Сроки: [когда хочет заехать/купить — если упомянуто]

💰 ФИНАНСЫ
Бюджет: [сумма или диапазон, если озвучен, иначе — «не озвучен»]
Готовность к первому взносу: [если обсуждали]
Отношение к рассрочке: [если обсуждали]

⚠️ ВОЗРАЖЕНИЯ И СОМНЕНИЯ
[Конкретные фразы или смысл того, что беспокоит клиента]
[Если возражений не было — «Явных возражений не высказал»]

📋 ЧТО ОБСУДИЛИ
[2-4 предложения: ключевые моменты разговора]

➡️ СЛЕДУЮЩИЙ ШАГ
[Конкретная договорённость: что, когда, кто делает]
[Если не договорились — «Конкретного следующего шага не зафиксировано»]

## Квалификация лида

По умолчанию лид считается ✅ Квал. Лид признаётся ❌ Неквал только если из разговора однозначно следует:
- Ищет аренду, а не покупку
- Не тот продукт (коммерческая, земля, дом)
- Категорически не рассматривает Дурлешты
- Нет бюджета вообще (не путать с «не озвучен»)
- Не принимает решение и не связан с ЛПР
- Спам, ошибка, поставщик

Сомневающийся клиент — это квал. «Просто узнаю цены» — это квал.

## Температура клиента

🔥 Горячий: конкретные вопросы, обсуждает финансы, готов приехать, сравнивает конкурентов, говорит о сроках.
🟡 Тёплый: интересуется, но много сомнений, общие вопросы, «пока думаем», не готов к шагу.
🔵 Холодный: просто узнаёт цены, не раскрывает потребности, короткие ответы, «просто интересуюсь».

## Edge cases

Короткий звонок (< 1 мин, бессодержательный):
📞 Короткий звонок — нет содержательной информации.
Причина: [сброс / «перезвоню позже» / ошибочный номер / автоответчик]

Нерелевантный звонок:
📞 Нерелевантный звонок.
Тема: [поставщик / реклама / спам]

Неразборчивая транскрипция:
⚠️ Транскрипция низкого качества — резюме может быть неточным.
[Далее — резюме по тому, что удалось разобрать]

## Чего НЕ делать
- Не пересказывай дословно
- Не добавляй оценки менеджера
- Не давай рекомендации
- Не используй канцелярит
- Не плоди пустые поля

## Формат ответа

Всегда возвращай ответ в формате JSON (без markdown, без backticks):

{
  "status": "relevant",
  "summary_text": "🤖 AI-резюме звонка\\n━━━━━━━━━━━━━━━━━━\\n\\n...",
  "metadata": {
    "temperature": "Тёплый",
    "qualified": true,
    "disqualification_reason": null,
    "client_name": "Андрей",
    "interest": "2-комн., Select New Town",
    "budget_mentioned": false,
    "objections": ["пробки в Дурлештах", "страх недостроя"],
    "next_step": "Перезвон в четверг",
    "next_step_date": null
  }
}

Для нерелевантных/коротких звонков:
{
  "status": "irrelevant",
  "reason": "Рекламный звонок от поставщика окон",
  "summary_text": "📞 Нерелевантный звонок.\\nТема: поставщик окон"
}`;

// ── Evaluation prompt (оценка менеджера) ───────────────────────────────────────

const EVALUATION_SYSTEM_PROMPT = `Ты — эксперт по оценке менеджеров по продажам в сфере недвижимости.
Компания: Isragrup (застройщик в Молдове, Кишинёв, Дурлешты).

Тебе дают транскрипцию телефонного звонка. Оцени работу менеджера по продажам.

Тебе также могут дать контекст из базы знаний компании — используй его чтобы понять, правильно ли менеджер подаёт информацию о продуктах и условиях.

Ответь СТРОГО в формате JSON (без markdown, без backticks):

{
  "evaluation": {
    "score_greeting": 7,
    "score_needs": 8,
    "score_presentation": 6,
    "score_objections": 5,
    "score_closing": 7,
    "recommendations": "Конкретные рекомендации менеджеру."
  }
}

ПРАВИЛА ОЦЕНКИ (каждый критерий 1-10):

score_greeting (Приветствие и контакт):
- Представился ли, назвал компанию
- Был ли дружелюбен, создал ли комфортную атмосферу
- 1-3: не представился, грубо или безразлично
- 4-6: представился но формально
- 7-8: хорошее приветствие, дружелюбный тон
- 9-10: идеальное приветствие

score_needs (Выявление потребностей):
- Задавал ли открытые вопросы
- Выяснил ли что ищет, для кого, бюджет, сроки
- 1-3: не спрашивал, сразу начал продавать
- 4-6: задал пару вопросов, поверхностно
- 7-8: хорошо выяснил основные потребности
- 9-10: глубокое выявление, понял мотивацию

score_presentation (Презентация):
- Предложил ли конкретные варианты
- Описал ли преимущества под потребности клиента
- 1-3: ничего не предложил или общие фразы
- 4-6: предложил без привязки к потребностям
- 7-8: хорошая адаптированная презентация
- 9-10: идеальное попадание

score_objections (Работа с возражениями):
- Если возражений не было — ставь 5 (нейтрально)
- 1-3: игнорировал или спорил
- 4-6: пытался, но неубедительно
- 7-8: хорошо снял основные возражения
- 9-10: мастерски обработал все возражения

score_closing (Закрытие на следующий шаг):
- Договорился ли о конкретном действии
- 1-3: отпустил клиента, никакого follow-up
- 4-6: размыто «позвоните если что»
- 7-8: конкретный следующий шаг с датой
- 9-10: встреча назначена, клиент подтвердил

ВАЖНО:
- Если повторный звонок — менеджер может не представляться заново, это нормально.
- Оценивай объективно. Не завышай и не занижай.
- Рекомендации пиши конкретно: "не спросил про бюджет", "забыл предложить рассрочку".
- Пиши рекомендации на русском.`;

// ── RAG context fetcher ────────────────────────────────────────────────────────

/**
 * Fetch relevant context from knowledge base for the call transcript.
 *
 * @param {string} transcript
 * @returns {Promise<string>}
 */
async function fetchRAGContext(transcript) {
  try {
    // Take first 500 chars of transcript as search query — enough for semantic match
    const query = transcript.substring(0, 500);
    const results = await searchKnowledgeBase(query, { limit: 3, threshold: 0.2 });

    if (results.length === 0) return '';

    const context = results.map((r) =>
      `[${r.document_title}]\n${r.content}`
    ).join('\n\n---\n\n');

    return context;
  } catch (err) {
    console.warn(`[ANALYZE] RAG поиск не удался: ${err.message}`);
    return '';
  }
}

// ── Build user messages ────────────────────────────────────────────────────────

function buildSummaryMessage(transcript, clientProfile, previousSummaries, ragContext) {
  const parts = [];

  if (ragContext) {
    parts.push('=== КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ КОМПАНИИ ===');
    parts.push(ragContext);
    parts.push('');
  }

  if (clientProfile) {
    parts.push('=== ПРОФИЛЬ КЛИЕНТА ===');
    if (clientProfile.name) parts.push(`Имя: ${clientProfile.name}`);
    if (clientProfile.desired_property) parts.push(`Хочет: ${clientProfile.desired_property}`);
    if (clientProfile.budget) parts.push(`Бюджет: ${clientProfile.budget}`);
    if (clientProfile.concerns) parts.push(`Опасения: ${clientProfile.concerns}`);
    if (clientProfile.source) parts.push(`Источник: ${clientProfile.source}`);
    if (clientProfile.timeline) parts.push(`Сроки: ${clientProfile.timeline}`);
    if (clientProfile.total_calls > 0) parts.push(`Кол-во предыдущих звонков: ${clientProfile.total_calls}`);
    parts.push('');
  }

  if (previousSummaries && previousSummaries.length > 0) {
    parts.push('=== ПРЕДЫДУЩИЕ ЗВОНКИ ===');
    previousSummaries.forEach((s, i) => parts.push(`Звонок ${i + 1}: ${s}`));
    parts.push('');
  }

  parts.push('=== ТРАНСКРИПЦИЯ ТЕКУЩЕГО ЗВОНКА ===');
  parts.push(transcript);

  return parts.join('\n');
}

function buildEvaluationMessage(transcript, ragContext) {
  const parts = [];

  if (ragContext) {
    parts.push('=== КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ КОМПАНИИ ===');
    parts.push('Используй этот контекст чтобы оценить, насколько правильно менеджер подаёт информацию о продуктах и условиях.');
    parts.push(ragContext);
    parts.push('');
  }

  parts.push('=== ТРАНСКРИПЦИЯ ЗВОНКА ===');
  parts.push(transcript);

  return parts.join('\n');
}

// ── Call 1: Summary ────────────────────────────────────────────────────────────

async function summarizeCall(transcript, clientProfile, previousSummaries, ragContext) {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildSummaryMessage(transcript, clientProfile, previousSummaries, ragContext),
        },
      ],
    });

    const raw = message.content[0].text;
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      status: parsed.status || 'relevant',
      summary_text: parsed.summary_text || raw,
      reason: parsed.reason || null,
      metadata: parsed.metadata || {},
    };
  } catch (err) {
    console.error('[ANALYZE] Ошибка резюме:', err.message);
    return {
      status: 'error',
      summary_text: 'Ошибка генерации резюме.',
      reason: null,
      metadata: {},
    };
  }
}

// ── Call 2: Evaluation ─────────────────────────────────────────────────────────

async function evaluateManager(transcript, ragContext) {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      language: 'ro',
      max_tokens: 800,
      system: EVALUATION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildEvaluationMessage(transcript, ragContext),
        },
      ],
    });

    const raw = message.content[0].text;
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const eval_ = parsed.evaluation || {};

    const scores = {
      score_greeting: clampScore(eval_.score_greeting),
      score_needs: clampScore(eval_.score_needs),
      score_presentation: clampScore(eval_.score_presentation),
      score_objections: clampScore(eval_.score_objections),
      score_closing: clampScore(eval_.score_closing),
    };

    const scoreValues = Object.values(scores);
    const score_total = Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length);

    return {
      ...scores,
      score_total,
      recommendations: eval_.recommendations || 'Нет рекомендаций.',
    };
  } catch (err) {
    console.error('[ANALYZE] Ошибка оценки:', err.message);
    return {
      score_greeting: 0,
      score_needs: 0,
      score_presentation: 0,
      score_objections: 0,
      score_closing: 0,
      score_total: 0,
      recommendations: 'Оценка недоступна (ошибка обработки).',
    };
  }
}

// ── Orchestrator ───────────────────────────────────────────────────────────────

/**
 * Full analysis: RAG context + summary + evaluation.
 * Runs both Claude calls in parallel.
 *
 * @param {string} transcript
 * @param {Object|null} clientProfile
 * @param {string[]|null} previousSummaries
 * @returns {Promise<Object>}
 */
export async function analyzeTranscript(transcript, clientProfile = null, previousSummaries = null) {
  // Fetch RAG context once, share between both calls
  console.log('[ANALYZE] Загружаю контекст из базы знаний...');
  const ragContext = await fetchRAGContext(transcript);
  if (ragContext) {
    console.log(`[ANALYZE] RAG контекст: ${ragContext.length} символов`);
  } else {
    console.log('[ANALYZE] RAG контекст не найден');
  }

  // Run both calls in parallel
  console.log('[ANALYZE] Запускаю резюме + оценку параллельно...');
  const [summary, evaluation] = await Promise.all([
    summarizeCall(transcript, clientProfile, previousSummaries, ragContext),
    evaluateManager(transcript, ragContext),
  ]);

  // Extract data from new summary format for backward compatibility
  const meta = summary.metadata || {};

  // Build tags from metadata
  const tags = [];
  if (meta.temperature === 'Горячий') tags.push('горячий клиент');
  if (meta.temperature === 'Холодный') tags.push('холодный клиент');
  if (meta.temperature === 'Тёплый') tags.push('тёплый клиент');
  if (meta.qualified === false) tags.push('неквал');

  // Map next_step to has_next_step logic
  const hasNextStep = meta.next_step && !meta.next_step.toLowerCase().includes('не зафиксировано');

  // Estimate next_step_deadline_days from next_step_date
  let nextStepDeadlineDays = 1;
  if (meta.next_step_date) {
    try {
      const diff = Math.ceil((new Date(meta.next_step_date) - new Date()) / (1000 * 60 * 60 * 24));
      if (diff > 0) nextStepDeadlineDays = diff;
    } catch { /* use default */ }
  }

  return {
    // Summary data
    status: summary.status,
    summary: summary.summary_text,
    summary_metadata: meta,

    // Backward-compatible fields
    client_name: meta.client_name || null,
    tags,
    has_next_step: hasNextStep,
    next_step_text: meta.next_step || null,
    next_step_deadline_days: nextStepDeadlineDays,

    // Evaluation
    evaluation,

    // Client insights (mapped from new metadata)
    client_insights: {
      desired_property: meta.interest || null,
      budget: meta.budget_mentioned ? null : null, // budget value not extracted in new format as text
      concerns: meta.objections ? meta.objections.join('; ') : null,
      source: null, // extracted in summary_text, not in metadata
      timeline: null,
      notes: meta.disqualification_reason || null,
    },
  };
}

/**
 * Clamp a score to 1-10 range. Returns 0 if invalid.
 */
function clampScore(val) {
  const n = Number(val);
  if (isNaN(n) || n < 1) return 0;
  if (n > 10) return 10;
  return Math.round(n);
}