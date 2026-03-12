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
} from './rag.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

// ── POST /rag/ask — Question answering with RAG context ────────────────────────

const RAG_SYSTEM_PROMPT = `Ты — AI-ассистент компании Isragrup (застройщик в Молдове, Кишинёв).
Твоя задача — отвечать на вопросы, используя ТОЛЬКО предоставленный контекст из базы знаний.

Правила:
- Отвечай на том языке, на котором задан вопрос (русский или румынский).
- Если в контексте нет информации для ответа — честно скажи что не знаешь, не выдумывай.
- Отвечай конкретно и по делу. Не добавляй информацию, которой нет в контексте.
- Если вопрос касается цен или условий — приводи точные цифры из контекста.
- Будь дружелюбным и профессиональным.`;

router.post('/ask', async (req, res) => {
  const { question, limit, threshold } = req.body;

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'Параметр question обязателен' });
  }

  try {
    // 1. Search knowledge base
    const results = await searchKnowledgeBase(question.trim(), {
      limit: Number(limit) || 5,
      threshold: Number(threshold) || 0.2,
    });

    if (results.length === 0) {
      return res.json({
        ok: true,
        answer: 'К сожалению, в базе знаний нет информации по вашему вопросу.',
        sources: [],
      });
    }

    // 2. Build context from chunks
    const contextParts = results.map((r, i) =>
      `[Источник ${i + 1}: ${r.document_title}]\n${r.content}`
    );
    const context = contextParts.join('\n\n---\n\n');

    // 3. Ask Claude with context
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: RAG_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Контекст из базы знаний:\n\n${context}\n\n---\n\nВопрос: ${question.trim()}`,
        },
      ],
    });

    const answer = message.content[0].text;

    // 4. Return answer with sources
    const sources = results.map((r) => ({
      document_title: r.document_title,
      content_preview: r.content.substring(0, 200),
      similarity: r.similarity,
    }));

    console.log(`[RAG API] Вопрос: "${question.trim()}" → ${results.length} источников`);

    res.json({ ok: true, answer, sources });
  } catch (err) {
    console.error(`[RAG API] Ошибка /ask:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;