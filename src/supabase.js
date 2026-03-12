import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Find or create a client by phone number.
 * Returns the client row.
 *
 * @param {string} phone
 * @returns {Promise<Object>}
 */
export async function findOrCreateClient(phone) {
  // Try to find existing client
  const { data: existing, error: findErr } = await supabase
    .from('clients')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (findErr) throw new Error(`[DB] Ошибка поиска клиента: ${findErr.message}`);

  if (existing) return existing;

  // Create new client
  const { data: created, error: createErr } = await supabase
    .from('clients')
    .insert({ phone })
    .select()
    .single();

  if (createErr) throw new Error(`[DB] Ошибка создания клиента: ${createErr.message}`);

  console.log(`[DB] Новый клиент создан: ${phone}`);
  return created;
}

/**
 * Find manager by their Moldcell PBX user login.
 *
 * @param {string} pbxUser - user login from PBX webhook
 * @returns {Promise<Object|null>}
 */
export async function findManagerByPbxUser(pbxUser) {
  const { data, error } = await supabase
    .from('managers')
    .select('*')
    .eq('pbx_user', pbxUser)
    .maybeSingle();

  if (error) {
    console.error(`[DB] Ошибка поиска менеджера: ${error.message}`);
    return null;
  }

  if (!data) {
    console.warn(`[DB] Менеджер с pbx_user="${pbxUser}" не найден`);
    return null;
  }

  return data;
}

/**
 * Create a call record in the database.
 *
 * @param {Object} callData
 * @returns {Promise<Object>}
 */
export async function createCall(callData) {
  const { data, error } = await supabase
    .from('calls')
    .insert(callData)
    .select()
    .single();

  if (error) throw new Error(`[DB] Ошибка создания звонка: ${error.message}`);

  return data;
}

/**
 * Update a call record.
 *
 * @param {string} callId
 * @param {Object} updates
 * @returns {Promise<void>}
 */
export async function updateCall(callId, updates) {
  const { error } = await supabase
    .from('calls')
    .update(updates)
    .eq('id', callId);

  if (error) throw new Error(`[DB] Ошибка обновления звонка: ${error.message}`);
}

/**
 * Save evaluation for a call.
 *
 * @param {Object} evalData
 * @returns {Promise<void>}
 */
export async function saveEvaluation(evalData) {
  const { error } = await supabase
    .from('evaluations')
    .insert(evalData);

  if (error) throw new Error(`[DB] Ошибка сохранения оценки: ${error.message}`);
}

/**
 * Save extracted insights from a call.
 *
 * @param {Object} insightsData
 * @returns {Promise<void>}
 */
export async function saveCallInsights(insightsData) {
  const { error } = await supabase
    .from('call_insights')
    .insert(insightsData);

  if (error) throw new Error(`[DB] Ошибка сохранения insights: ${error.message}`);
}

/**
 * Update client profile with new data from call analysis.
 * Only updates fields that are currently null or if new data is provided.
 *
 * @param {string} clientId
 * @param {Object} insights
 * @param {string|null} clientName
 * @returns {Promise<void>}
 */
export async function updateClientProfile(clientId, insights, clientName) {
  const updates = {};

  if (clientName) updates.name = clientName;
  if (insights.desired_property) updates.desired_property = insights.desired_property;
  if (insights.budget) updates.budget = insights.budget;
  if (insights.concerns) updates.concerns = insights.concerns;
  if (insights.source) updates.source = insights.source;
  if (insights.timeline) updates.timeline = insights.timeline;
  if (insights.notes) updates.notes = insights.notes;

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', clientId);

  if (error) throw new Error(`[DB] Ошибка обновления клиента: ${error.message}`);
}

/**
 * Update client's AmoCRM contact ID.
 *
 * @param {string} clientId
 * @param {number} amoContactId
 * @returns {Promise<void>}
 */
export async function updateClientAmoContactId(clientId, amoContactId) {
  const { error } = await supabase
    .from('clients')
    .update({ amo_contact_id: amoContactId })
    .eq('id', clientId);

  if (error) throw new Error(`[DB] Ошибка обновления amo_contact_id: ${error.message}`);
}

/**
 * Increment total_calls counter for a client.
 *
 * @param {string} clientId
 * @returns {Promise<void>}
 */
export async function incrementClientCalls(clientId) {
  const { error } = await supabase.rpc('increment_client_calls', { client_id: clientId });

  // Fallback if RPC doesn't exist: read-then-write
  if (error) {
    console.warn(`[DB] RPC increment_client_calls не найден, используем fallback: ${error.message}`);
    const { data } = await supabase
      .from('clients')
      .select('total_calls')
      .eq('id', clientId)
      .single();

    await supabase
      .from('clients')
      .update({ total_calls: (data?.total_calls ?? 0) + 1 })
      .eq('id', clientId);
  }
}

/**
 * Get summaries of previous calls with this client (for context).
 *
 * @param {string} clientId
 * @param {number} limit
 * @returns {Promise<string[]>}
 */
export async function getPreviousCallSummaries(clientId, limit = 5) {
  const { data, error } = await supabase
    .from('calls')
    .select('created_at, transcript')
    .eq('client_id', clientId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) return [];

  // Return short excerpts — full transcripts would be too long for context
  return data.map((c) => {
    const date = new Date(c.created_at).toLocaleDateString('ru-RU');
    const preview = c.transcript?.substring(0, 300) ?? 'нет транскрипции';
    return `[${date}] ${preview}...`;
  });
}

/**
 * Upload audio file to Supabase Storage.
 *
 * @param {string} filePath - local file path
 * @param {string} callid - call ID for naming
 * @returns {Promise<string>} storage path
 */
export async function uploadAudio(filePath, callid) {
  const fs = await import('fs');
  const fileBuffer = fs.readFileSync(filePath);
  const storagePath = `${new Date().getFullYear()}/${callid}.mp3`;

  const { error } = await supabase.storage
    .from('call-recordings')
    .upload(storagePath, fileBuffer, {
      contentType: 'audio/mpeg',
      upsert: false,
    });

  if (error) throw new Error(`[DB] Ошибка загрузки аудио: ${error.message}`);

  return storagePath;
}