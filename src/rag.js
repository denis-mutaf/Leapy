import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Constants ──────────────────────────────────────────────────────────────────

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

/** Target chunk size in characters (~400 tokens ≈ 1600 chars for ru/ro) */
const CHUNK_SIZE = 1500;
/** Overlap between chunks in characters */
const CHUNK_OVERLAP = 200;

const STORAGE_BUCKET = 'rag-documents';

const SUPPORTED_TYPES = ['pdf', 'docx', 'txt', 'html', 'md'];

// ── Parsing ────────────────────────────────────────────────────────────────────

/**
 * Extract text content from a file based on its type.
 *
 * @param {string} filePath - path to the local file
 * @param {string} fileType - one of SUPPORTED_TYPES
 * @returns {Promise<string>}
 */
export async function extractText(filePath, fileType) {
  switch (fileType) {
    case 'txt':
    case 'md':
      return fs.readFileSync(filePath, 'utf-8');

    case 'html': {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return stripHtml(raw);
    }

    case 'pdf': {
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
      const buffer = fs.readFileSync(filePath);
      const result = await pdfParse(buffer);
      return result.text;
    }

    case 'docx': {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }

    default:
      throw new Error(`Неподдерживаемый тип файла: ${fileType}`);
  }
}

/**
 * Strip HTML tags and decode basic entities.
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Chunking ───────────────────────────────────────────────────────────────────

/**
 * Split text into overlapping chunks using recursive character splitting.
 * Tries to split on paragraph boundaries first, then sentences, then words.
 *
 * @param {string} text
 * @param {number} chunkSize - target chunk size in characters
 * @param {number} overlap - overlap between chunks in characters
 * @returns {{ content: string, index: number }[]}
 */
export function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  if (!text || text.trim().length === 0) return [];

  const cleaned = text.replace(/\n{3,}/g, '\n\n').trim();

  if (cleaned.length <= chunkSize) {
    return [{ content: cleaned, index: 0 }];
  }

  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < cleaned.length) {
    let end = start + chunkSize;

    if (end >= cleaned.length) {
      chunks.push({ content: cleaned.slice(start).trim(), index });
      break;
    }

    // Try to find a natural break point: paragraph > sentence > word
    let breakPoint = findBreakPoint(cleaned, start, end);
    if (breakPoint <= start) breakPoint = end; // fallback: hard cut

    const chunk = cleaned.slice(start, breakPoint).trim();
    if (chunk.length > 0) {
      chunks.push({ content: chunk, index });
      index++;
    }

    start = breakPoint - overlap;
    if (start < 0) start = 0;
    // Avoid infinite loop
    if (start >= breakPoint) start = breakPoint;
  }

  return chunks;
}

/**
 * Find the best break point between start and end.
 * Prefers paragraph breaks (\n\n), then line breaks (\n), then sentence ends, then spaces.
 */
function findBreakPoint(text, start, end) {
  const segment = text.slice(start, end);

  // Paragraph break
  const lastParagraph = segment.lastIndexOf('\n\n');
  if (lastParagraph > segment.length * 0.3) return start + lastParagraph + 2;

  // Line break
  const lastNewline = segment.lastIndexOf('\n');
  if (lastNewline > segment.length * 0.3) return start + lastNewline + 1;

  // Sentence end (. ! ?)
  const sentenceMatch = segment.match(/.*[.!?]\s/s);
  if (sentenceMatch) {
    const sentenceEnd = sentenceMatch[0].length;
    if (sentenceEnd > segment.length * 0.3) return start + sentenceEnd;
  }

  // Space
  const lastSpace = segment.lastIndexOf(' ');
  if (lastSpace > segment.length * 0.3) return start + lastSpace + 1;

  return end;
}

// ── Embeddings ─────────────────────────────────────────────────────────────────

/**
 * Get embeddings for an array of texts.
 * OpenAI supports batching up to 2048 inputs.
 *
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export async function getEmbeddings(texts) {
  if (texts.length === 0) return [];

  // OpenAI batch limit is 2048; split if needed
  const BATCH_SIZE = 500;
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    const embeddings = response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);

    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

/**
 * Get embedding for a single text (for search queries).
 *
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function getQueryEmbedding(text) {
  const [embedding] = await getEmbeddings([text]);
  return embedding;
}

// ── Rough token count ──────────────────────────────────────────────────────────

/**
 * Approximate token count. ~4 chars per token for English, ~2-3 for Cyrillic.
 * Good enough for metadata; not used for billing.
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 3);
}

// ── Document pipeline ──────────────────────────────────────────────────────────

/**
 * Detect file type from extension.
 * @param {string} fileName
 * @returns {string}
 */
export function detectFileType(fileName) {
  const ext = path.extname(fileName).toLowerCase().replace('.', '');
  if (SUPPORTED_TYPES.includes(ext)) return ext;
  throw new Error(`Неподдерживаемый формат: .${ext}. Поддерживаются: ${SUPPORTED_TYPES.join(', ')}`);
}

/**
 * Full pipeline: create document record → parse → chunk → embed → save chunks.
 *
 * @param {string} filePath - local path to uploaded file
 * @param {string} fileName - original file name
 * @param {Object} [options]
 * @param {string} [options.title] - document title (defaults to fileName)
 * @param {Object} [options.metadata] - arbitrary metadata
 * @returns {Promise<Object>} the document record
 */
export async function ingestDocument(filePath, fileName, options = {}) {
  const fileType = detectFileType(fileName);
  const fileSize = fs.statSync(filePath).size;
  const title = options.title || fileName.replace(/\.[^.]+$/, '');

  // 1. Create document record
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .insert({
      title,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      status: 'processing',
      metadata: options.metadata || {},
    })
    .select()
    .single();

  if (docErr) throw new Error(`Ошибка создания документа: ${docErr.message}`);

  try {
    // 2. Upload original file to storage
    const storagePath = `${doc.id}/${fileName}`;
    const fileBuffer = fs.readFileSync(filePath);

    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, { upsert: false });

    if (uploadErr) {
      console.warn(`[RAG] Ошибка загрузки в Storage (не критично): ${uploadErr.message}`);
    } else {
      await supabase
        .from('documents')
        .update({ storage_path: storagePath })
        .eq('id', doc.id);
    }

    // 3. Extract text
    console.log(`[RAG] Извлекаю текст из ${fileName} (${fileType})...`);
    const text = await extractText(filePath, fileType);

    if (!text || text.trim().length === 0) {
      throw new Error('Файл не содержит текста');
    }

    console.log(`[RAG] Текст: ${text.length} символов`);

    // 4. Chunk
    const chunks = chunkText(text);
    console.log(`[RAG] Чанков: ${chunks.length}`);

    if (chunks.length === 0) {
      throw new Error('Не удалось разбить текст на чанки');
    }

    // 5. Embed all chunks
    console.log(`[RAG] Генерирую embeddings...`);
    const embeddings = await getEmbeddings(chunks.map((c) => c.content));

    // 6. Save chunks to DB
    const chunkRows = chunks.map((chunk, i) => ({
      document_id: doc.id,
      chunk_index: chunk.index,
      content: chunk.content,
      token_count: estimateTokens(chunk.content),
      embedding: JSON.stringify(embeddings[i]),
      metadata: {},
    }));

    // Insert in batches (Supabase has row limits per insert)
    const INSERT_BATCH = 100;
    for (let i = 0; i < chunkRows.length; i += INSERT_BATCH) {
      const batch = chunkRows.slice(i, i + INSERT_BATCH);
      const { error: chunkErr } = await supabase
        .from('document_chunks')
        .insert(batch);

      if (chunkErr) throw new Error(`Ошибка сохранения чанков: ${chunkErr.message}`);
    }

    // 7. Mark document as ready
    await supabase
      .from('documents')
      .update({ status: 'ready', chunk_count: chunks.length })
      .eq('id', doc.id);

    console.log(`[RAG] ✅ Документ "${title}" загружен: ${chunks.length} чанков`);

    return { ...doc, status: 'ready', chunk_count: chunks.length };
  } catch (err) {
    // Mark document as failed
    await supabase
      .from('documents')
      .update({ status: 'failed', error: err.message })
      .eq('id', doc.id);

    throw err;
  }
}

// ── Search ─────────────────────────────────────────────────────────────────────

/**
 * Semantic search across the knowledge base.
 *
 * @param {string} query - natural language query
 * @param {Object} [options]
 * @param {number} [options.limit=5] - max results
 * @param {number} [options.threshold=0.3] - minimum similarity (0-1)
 * @returns {Promise<Object[]>}
 */
export async function searchKnowledgeBase(query, options = {}) {
  const { limit = 5, threshold = 0.3 } = options;

  const queryEmbedding = await getQueryEmbedding(query);

  const { data, error } = await supabase.rpc('search_documents', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: limit,
    similarity_threshold: threshold,
  });

  if (error) throw new Error(`Ошибка поиска: ${error.message}`);

  return (data || []).map((row) => ({
    chunk_id: row.chunk_id,
    document_id: row.document_id,
    document_title: row.document_title,
    content: row.content,
    similarity: Math.round(row.similarity * 1000) / 1000,
    metadata: row.chunk_metadata,
  }));
}

// ── Document management ────────────────────────────────────────────────────────

/**
 * List all documents.
 *
 * @returns {Promise<Object[]>}
 */
export async function listDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, file_name, file_type, file_size, chunk_count, status, error, metadata, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Ошибка получения документов: ${error.message}`);
  return data || [];
}

/**
 * Get a single document by ID.
 *
 * @param {string} documentId
 * @returns {Promise<Object|null>}
 */
export async function getDocument(documentId) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle();

  if (error) throw new Error(`Ошибка получения документа: ${error.message}`);
  return data;
}

/**
 * Delete a document and all its chunks (CASCADE handles chunks).
 * Also removes the file from storage.
 *
 * @param {string} documentId
 * @returns {Promise<void>}
 */
export async function deleteDocument(documentId) {
  // Get storage path before deleting
  const doc = await getDocument(documentId);
  if (!doc) throw new Error('Документ не найден');

  // Delete from storage
  if (doc.storage_path) {
    const { error: storageErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([doc.storage_path]);

    if (storageErr) {
      console.warn(`[RAG] Ошибка удаления из Storage: ${storageErr.message}`);
    }
  }

  // Delete from DB (CASCADE удалит чанки)
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (error) throw new Error(`Ошибка удаления документа: ${error.message}`);

  console.log(`[RAG] Документ "${doc.title}" удалён`);
}