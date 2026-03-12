import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANALYSIS_SYSTEM_PROMPT = `Ты — эксперт по оценке менеджеров по продажам в сфере недвижимости.

Компания: Isragrup (застройщик в Молдове, Кишинёв).

=== КОНТЕКСТ КОМПАНИИ ===
Isragrup Construction — застройщик с израильским опытом, 6 лет на рынке, 450+ семей заселены, 4 завершённых проекта.
Адрес офиса: str. Cartușa 95/5, Durlești (Дурлешты — пригород Кишинёва).
Телефоны: (+373) 61 030 040, (+373) 61 030 030
Основатели: Tudor și Ion Spînachi

ТЕКУЩИЕ ПРОЕКТЫ В ПРОДАЖЕ:
1. Select New Town — центр Дурлешт (Durlești), сдача 2028, строительство на финальной стадии (80%)
   - 1 комн. (1+1) от €51,125
   - 2 комн. (2+1) от €66,750
   - 3 комн. (3+1) от €81,900
   - Первый взнос от 10% (от €5,900), рассрочка до 7 лет, от €780/мес

2. Next New Town — центр Дурлешт (Durlești), сдача 2030, этап котлована
   - 1 комн. (1+1) от €43,010
   - 2 комн. (2+1) от €55,770
   - 3 комн. (3+1) от €85,300
   - Первый взнос от 10% (от €5,200), рассрочка до 8 лет, от €600/мес
   - 6 блоков, 3 уровня подземного паркинга, 105% парковочных мест

ЗАВЕРШЁННЫЕ ПРОЕКТЫ (для справки):
- Hi-Tech Poiana Domnească (2020) — дома 300-350 м²
- Style House (2021) — двухуровневые дома из красного кирпича
- Casa Verde (2021) — 71 квартира, Дурлешты
- New Town (2024) — 125 квартир, 2 секции

УСЛОВИЯ ПОКУПКИ:
- Рассрочка от застройщика до 7-8 лет без процентов
- Первый взнос от 10%
- Максимальная скидка при 100% оплате
- Квартиры в сданном доме доступны в ипотеку
- Варианты: белый вариант, с ремонтом, с мебелью

ПРЕИМУЩЕСТВА (что менеджер должен упоминать):
- 0 задержек сдачи за всю историю компании
- 98% клиентов рекомендуют
- Керамоблок, бетон от топ-производителя, окна Rehau
- Итальянские котлы, тёплые полы европейских брендов
- Закрытый двор, подземная парковка, кладовые
- Инвесторам: +20-40% доходности

ВАЖНО ПО ГЕОГРАФИИ:
- Durlești (Дурлешты/Дурлешть) — это пригород Кишинёва, НЕ "Дурлеще". Правильно: Дурлешты.
- Poiana Domnească — район рядом с Дурлештами
- Адрес: str. Cartușa 95/5, Durlești

=== ЯЗЫК ===
Звонки могут быть на русском, румынском, или смешанные (один говорит на русском, другой на румынском).
Всегда отвечай на РУССКОМ языке, даже если звонок был на румынском.
Правильно транслитерируй румынские имена и названия.

Тебе дают транскрипцию телефонного звонка между менеджером по продажам и клиентом.
Также тебе могут дать профиль клиента и саммари предыдущих звонков — учитывай этот контекст при оценке.

Ответь СТРОГО в формате JSON (без markdown, без backticks, только JSON объект):

{
  "client_name": "имя клиента если назвал себя, иначе null",

  "summary": "подробное резюме звонка с секциями:\\n📋 Тема звонка: ...\\n💬 Детали разговора: ...\\n💰 Финансовые детали: ... (суммы точно как сказано)\\n✅ Договорённости: ...\\n🎯 Следующий шаг: ...",

  "tags": ["массив тегов из списка: входящий звонок, исходящий звонок, горячий клиент, холодный клиент, перезвонить, квартира, дом, коммерческая недвижимость, жалоба, консультация, повторный звонок"],

  "has_next_step": true,
  "next_step_text": "текст следующего шага если есть, иначе null",
  "next_step_deadline_days": 1,

  "evaluation": {
    "score_greeting": 7,
    "score_needs": 8,
    "score_presentation": 6,
    "score_objections": 5,
    "score_closing": 7,
    "recommendations": "Конкретные рекомендации менеджеру: что сделал хорошо, что забыл, что улучшить. Пиши по делу, без воды."
  },

  "client_insights": {
    "desired_property": "что хочет клиент: тип, комнаты, этаж, район — или null",
    "budget": "бюджет если обсуждался — или null",
    "concerns": "страхи, возражения, сомнения — или null",
    "source": "как узнал о компании — или null",
    "timeline": "когда хочет купить/заехать — или null",
    "notes": "всё остальное важное — или null"
  }
}

ПРАВИЛА ОЦЕНКИ (каждый критерий 1-10):

score_greeting (Приветствие и контакт):
- Представился ли, назвал компанию
- Был ли дружелюбен, создал ли комфортную атмосферу
- 1-3: не представился, грубо или безразлично
- 4-6: представился но формально, без энергии
- 7-8: хорошее приветствие, дружелюбный тон
- 9-10: идеальное приветствие, сразу расположил к себе

score_needs (Выявление потребностей):
- Задавал ли открытые вопросы
- Выяснил ли что ищет, для кого, бюджет, сроки
- 1-3: вообще не спрашивал, сразу начал продавать
- 4-6: задал пару вопросов, но поверхностно
- 7-8: хорошо выяснил основные потребности
- 9-10: глубокое выявление, понял мотивацию клиента

score_presentation (Презентация):
- Предложил ли конкретные варианты
- Описал ли преимущества под потребности клиента
- 1-3: ничего не предложил или общие фразы
- 4-6: предложил но без привязки к потребностям
- 7-8: хорошая адаптированная презентация
- 9-10: идеальное попадание, клиент заинтересовался

score_objections (Работа с возражениями):
- Если возражений не было — ставь 5 (нейтрально)
- Как реагировал на сомнения и возражения
- 1-3: игнорировал или спорил
- 4-6: пытался, но неубедительно
- 7-8: хорошо снял основные возражения
- 9-10: мастерски обработал все возражения

score_closing (Закрытие на следующий шаг):
- Договорился ли о конкретном действии
- 1-3: отпустил клиента, никакого follow-up
- 4-6: размыто договорился "позвоните если что"
- 7-8: конкретный следующий шаг с датой
- 9-10: встреча/просмотр назначены, клиент подтвердил

ВАЖНО:
- Если это повторный звонок — учитывай контекст. Менеджер может не представляться заново и не выяснять потребности с нуля, это нормально.
- Оценивай объективно. Не завышай и не занижай.
- Рекомендации пиши конкретно: "ты не спросил про бюджет", "забыл предложить рассрочку", "хорошо обработал возражение про цену".`;

/**
 * @typedef {Object} Evaluation
 * @property {number} score_greeting
 * @property {number} score_needs
 * @property {number} score_presentation
 * @property {number} score_objections
 * @property {number} score_closing
 * @property {number} score_total
 * @property {string} recommendations
 */

/**
 * @typedef {Object} ClientInsights
 * @property {string|null} desired_property
 * @property {string|null} budget
 * @property {string|null} concerns
 * @property {string|null} source
 * @property {string|null} timeline
 * @property {string|null} notes
 */

/**
 * @typedef {Object} CallAnalysis
 * @property {string|null} client_name
 * @property {string} summary
 * @property {string[]} tags
 * @property {boolean} has_next_step
 * @property {string|null} next_step_text
 * @property {number} next_step_deadline_days
 * @property {Evaluation} evaluation
 * @property {ClientInsights} client_insights
 */

/**
 * Fallback when Claude fails or returns unparseable JSON.
 *
 * @param {string} rawText
 * @returns {CallAnalysis}
 */
function fallbackAnalysis(rawText) {
  return {
    client_name: null,
    summary: rawText || 'Транскрипция недоступна (ошибка обработки).',
    tags: [],
    has_next_step: false,
    next_step_text: null,
    next_step_deadline_days: 1,
    evaluation: {
      score_greeting: 0,
      score_needs: 0,
      score_presentation: 0,
      score_objections: 0,
      score_closing: 0,
      score_total: 0,
      recommendations: 'Анализ недоступен (ошибка обработки).',
    },
    client_insights: {
      desired_property: null,
      budget: null,
      concerns: null,
      source: null,
      timeline: null,
      notes: null,
    },
  };
}

/**
 * Build user message with context from previous interactions.
 *
 * @param {string} transcript
 * @param {Object|null} clientProfile - existing client data from DB
 * @param {string[]|null} previousSummaries - summaries of past calls
 * @returns {string}
 */
function buildUserMessage(transcript, clientProfile, previousSummaries) {
  const parts = [];

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
    previousSummaries.forEach((s, i) => {
      parts.push(`Звонок ${i + 1}: ${s}`);
    });
    parts.push('');
  }

  parts.push('=== ТРАНСКРИПЦИЯ ТЕКУЩЕГО ЗВОНКА ===');
  parts.push(transcript);

  return parts.join('\n');
}

/**
 * Analyse a call transcript with Claude.
 *
 * @param {string} transcript
 * @param {Object|null} clientProfile - existing client data from DB
 * @param {string[]|null} previousSummaries - summaries of past calls with this client
 * @returns {Promise<CallAnalysis>}
 */
export async function analyzeTranscript(transcript, clientProfile = null, previousSummaries = null) {
  let raw;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserMessage(transcript, clientProfile, previousSummaries),
        },
      ],
    });

    raw = message.content[0].text;
  } catch (err) {
    console.error('[ANALYZE] Ошибка вызова Claude:', err.message);
    return fallbackAnalysis('');
  }

  try {
    // Strip markdown fences if Claude adds them despite instructions
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const evaluation = parsed.evaluation ?? {};
    const insights = parsed.client_insights ?? {};

    const scores = {
      score_greeting: clampScore(evaluation.score_greeting),
      score_needs: clampScore(evaluation.score_needs),
      score_presentation: clampScore(evaluation.score_presentation),
      score_objections: clampScore(evaluation.score_objections),
      score_closing: clampScore(evaluation.score_closing),
    };

    const scoreValues = Object.values(scores);
    const score_total = Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length);

    return {
      client_name: parsed.client_name ?? null,
      summary: parsed.summary ?? raw,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      has_next_step: Boolean(parsed.has_next_step),
      next_step_text: parsed.next_step_text ?? null,
      next_step_deadline_days: Number(parsed.next_step_deadline_days) || 1,
      evaluation: {
        ...scores,
        score_total,
        recommendations: evaluation.recommendations ?? 'Нет рекомендаций.',
      },
      client_insights: {
        desired_property: insights.desired_property ?? null,
        budget: insights.budget ?? null,
        concerns: insights.concerns ?? null,
        source: insights.source ?? null,
        timeline: insights.timeline ?? null,
        notes: insights.notes ?? null,
      },
    };
  } catch (parseErr) {
    console.error('[ANALYZE] Не удалось распарсить JSON от Claude:', parseErr.message);
    console.error('[ANALYZE] Raw response:', raw?.substring(0, 500));
    return fallbackAnalysis(raw);
  }
}

/**
 * Clamp a score to 1-10 range. Returns 0 if invalid.
 * @param {*} val
 * @returns {number}
 */
function clampScore(val) {
  const n = Number(val);
  if (isNaN(n) || n < 1) return 0;
  if (n > 10) return 10;
  return Math.round(n);
}