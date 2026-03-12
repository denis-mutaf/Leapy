import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import {
  ingestDocument,
  searchKnowledgeBase,
  listDocuments,
  getDocument,
  deleteDocument,
  detectFileType,
  extractText,
} from './rag.js';

const router = Router();

// ── File upload config ─────────────────────────────────────────────────────────

const upload = multer({
  dest: '/tmp/rag-uploads/',
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max
  },
  fileFilter: (_req, file, cb) => {
    try {
      detectFileType(file.originalname);
      cb(null, true);
    } catch (err) {
      cb(new Error(err.message));
    }
  },
});

// ── POST /rag/documents — Upload and ingest a document ─────────────────────────

router.post('/documents', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }

  const { title, metadata } = req.body;
  const tmpPath = req.file.path;

  try {
    let parsedMetadata = {};
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch {
        return res.status(400).json({ error: 'metadata должен быть валидным JSON' });
      }
    }

    console.log(`[RAG API] Загрузка: ${req.file.originalname} (${req.file.size} bytes)`);

    const doc = await ingestDocument(tmpPath, req.file.originalname, {
      title: title || undefined,
      metadata: parsedMetadata,
    });

    res.status(201).json({ ok: true, document: doc });
  } catch (err) {
    console.error(`[RAG API] Ошибка загрузки:`, err.message);
    res.status(500).json({ error: err.message });
  } finally {
    // Cleanup temp file
    fs.unlink(tmpPath, () => {});
  }
});

// ── GET /rag/documents — List all documents ────────────────────────────────────

router.get('/documents', async (_req, res) => {
  try {
    const docs = await listDocuments();
    res.json({ ok: true, documents: docs });
  } catch (err) {
    console.error(`[RAG API] Ошибка списка:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /rag/documents/:id — Get a single document ─────────────────────────────

router.get('/documents/:id', async (req, res) => {
  try {
    const doc = await getDocument(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Документ не найден' });
    res.json({ ok: true, document: doc });
  } catch (err) {
    console.error(`[RAG API] Ошибка получения:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /rag/documents/:id — Delete a document ──────────────────────────────

router.delete('/documents/:id', async (req, res) => {
  try {
    await deleteDocument(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(`[RAG API] Ошибка удаления:`, err.message);
    const status = err.message.includes('не найден') ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});

// ── POST /rag/generate-title — Generate document title with Claude ───────────

const TITLE_EXCERPT_MAX = 4000;
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

router.post('/generate-title', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }
  if (!anthropic) {
    return res.status(503).json({ error: 'Генерация названия недоступна (нет ANTHROPIC_API_KEY)' });
  }

  const tmpPath = req.file.path;

  try {
    const fileType = detectFileType(req.file.originalname);
    const fullText = await extractText(tmpPath, fileType);
    const excerpt = (fullText || '').trim().slice(0, TITLE_EXCERPT_MAX);
    if (!excerpt) {
      return res.json({ title: req.file.originalname.replace(/\.[^.]+$/, '') });
    }

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      system: 'Ты помогаешь давать короткие названия документам. Отвечай только названием на русском, 2–8 слов, без кавычек и точки.',
      messages: [
        {
          role: 'user',
          content: `По началу документа ниже предложи краткое название на русском (2–8 слов). Только название, без кавычек и точки.\n\nТекст:\n${excerpt}`,
        },
      ],
    });

    const raw = message.content[0]?.text ?? '';
    const title = raw.trim().replace(/^["']|["']\.?$/g, '').trim() || req.file.originalname.replace(/\.[^.]+$/, '');
    res.json({ title });
  } catch (err) {
    console.error('[RAG API] Ошибка генерации названия:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    fs.unlink(tmpPath, () => {});
  }
});

// ── POST /rag/search — Semantic search ─────────────────────────────────────────

router.post('/search', async (req, res) => {
  const { query, limit, threshold } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'Параметр query обязателен' });
  }

  try {
    const results = await searchKnowledgeBase(query.trim(), {
      limit: Number(limit) || 5,
      threshold: Number(threshold) || 0.3,
    });

    res.json({ ok: true, results });
  } catch (err) {
    console.error(`[RAG API] Ошибка поиска:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;