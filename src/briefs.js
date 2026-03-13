import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

/**
 * Получить бриф по slug.
 * Реальная схема briefs: id, slug, client_name, questions, created_at
 * @param {string} slug
 * @returns {Promise<{id: string, slug: string, client_name: string, questions: Array}>}
 */
export async function getBriefBySlug(slug) {
  const { data, error } = await supabase
    .from('briefs')
    .select('id, slug, client_name, questions')
    .eq('slug', slug)
    .single();
  if (error) throw error;
  // Нормализуем: возвращаем title как client_name для совместимости с фронтом
  return { ...data, title: data.client_name };
}

/**
 * Сохранить ответы на бриф.
 * Реальная схема brief_submissions: id, brief_id, slug, answers, submitted_at, is_complete
 * @param {string} slug
 * @param {Array<{question_id: string, question_text: string, answer: string}>} answersArray
 * @returns {Promise<{id: string, slug: string}>}
 */
export async function saveBriefSubmission(slug, answersArray) {
  const answersMap = Object.fromEntries(
    answersArray.map(({ question_id, answer }) => [question_id, answer]),
  );

  const { data, error } = await supabase
    .from('brief_submissions')
    .insert({ slug, answers: answersMap, is_complete: true })
    .select('id, slug, submitted_at')
    .single();
  if (error) throw error;
  return { ...data, created_at: data.submitted_at };
}

/**
 * Получить все отправленные брифы (для admin-панели).
 * @returns {Promise<Array<{id: string, slug: string, answers: object, created_at: string}>>}
 */
export async function getAllSubmissions() {
  const { data, error } = await supabase
    .from('brief_submissions')
    .select('id, slug, answers, submitted_at')
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  // Нормализуем submitted_at → created_at для совместимости с фронтом
  return data.map((row) => ({ ...row, created_at: row.submitted_at }));
}
