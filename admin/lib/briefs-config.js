/**
 * Метки вопросов для отображения в admin-панели и .md экспорте.
 * Ключ — slug брифа, значение — объект {question_id: label}.
 */
const QUESTION_LABELS = {
  furnicuta: {
    company_name:    'Название компании',
    activity:        'Вид деятельности',
    target_audience: 'Целевая аудитория',
    goal:            'Цель сайта',
    competitors:     'Конкуренты',
    style:           'Желаемый стиль',
    pages:           'Разделы сайта',
    deadline:        'Сроки',
  },
};

/**
 * Получить читаемую метку вопроса.
 * Если метка не найдена — вернуть question_id как есть.
 *
 * @param {string} slug
 * @param {string} questionId
 * @returns {string}
 */
export function getQuestionLabel(slug, questionId) {
  return QUESTION_LABELS[slug]?.[questionId] ?? questionId;
}
