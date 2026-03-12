// Always go directly to the backend URL.
// In dev set NEXT_PUBLIC_API_URL=http://localhost:3000 in admin/.env.local
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Parse an API response, throwing a readable error on failure.
 *
 * @param {Response} res
 * @returns {Promise<any>}
 */
async function parseResponse(res) {
  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Сервер вернул некорректный ответ (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(body?.error || body?.message || `Ошибка сервера (${res.status})`);
  }
  return body;
}

/**
 * Generate a document title from file content using Claude.
 *
 * @param {File} file
 * @returns {Promise<{ title: string }>}
 */
export async function generateTitle(file) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/rag/generate-title`, {
    method: 'POST',
    body: form,
  });

  const data = await parseResponse(res);
  return data;
}

/**
 * Upload a document to the RAG backend.
 *
 * @param {File} file
 * @param {string} [title]
 * @returns {Promise<{ id: string, title: string, file_name: string, file_type: string, file_size: number, chunk_count: number, status: string, created_at: string }>}
 */
export async function uploadDocument(file, title) {
  const form = new FormData();
  form.append('file', file);
  if (title?.trim()) form.append('title', title.trim());

  const res = await fetch(`${API_BASE}/rag/documents`, {
    method: 'POST',
    body: form,
  });

  const data = await parseResponse(res);
  return data.document;
}

/**
 * Fetch all documents.
 *
 * @returns {Promise<Array>}
 */
export async function getDocuments() {
  const res = await fetch(`${API_BASE}/rag/documents`, { cache: 'no-store' });
  const data = await parseResponse(res);
  return data.documents;
}

/**
 * Delete a document by ID.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteDocument(id) {
  const res = await fetch(`${API_BASE}/rag/documents/${id}`, { method: 'DELETE' });
  await parseResponse(res);
}

/**
 * Semantic search across the knowledge base.
 *
 * @param {string} query
 * @param {number} [limit]
 * @param {number} [threshold]
 * @returns {Promise<Array>}
 */
export async function searchDocuments(query, limit = 5, threshold = 0.3) {
  const res = await fetch(`${API_BASE}/rag/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit, threshold }),
  });
  const data = await parseResponse(res);
  return data.results;
}
