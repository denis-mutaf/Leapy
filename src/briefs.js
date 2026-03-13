import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

/**
 * Получить бриф по slug.
 * @param {string} slug
 * @returns {Promise<{id: string, slug: string, title: string, questions: Array}>}
 */
export async function getBriefBySlug(slug) {
  const { data, error } = await supabase
    .from('briefs')
    .select('id, slug, title, questions')
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Сохранить ответы на бриф.
 * @param {string} slug
 * @param {Array<{question_id: string, question_text: string, answer: string}>} answersArray
 * @returns {Promise<{id: string, slug: string, created_at: string}>}
 */
export async function saveBriefSubmission(slug, answersArray) {
  // Конвертируем массив [{question_id, answer}] → объект {question_id: answer}
  const answersMap = Object.fromEntries(
    answersArray.map(({ question_id, answer }) => [question_id, answer]),
  );

  const { data, error } = await supabase
    .from('brief_submissions')
    .insert({ slug, answers: answersMap })
    .select('id, slug, created_at')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Получить все отправленные брифы (для admin-панели).
 * @returns {Promise<Array<{id: string, slug: string, answers: object, created_at: string}>>}
 */
export async function getAllSubmissions() {
  const { data, error } = await supabase
    .from('brief_submissions')
    .select('id, slug, answers, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
