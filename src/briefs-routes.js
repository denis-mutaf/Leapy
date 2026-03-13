import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import OpenAI from 'openai';
import { getBriefBySlug, saveBriefSubmission, getAllSubmissions } from './briefs.js';

const router = Router();
const upload = multer({ dest: '/tmp/briefs-audio/' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * GET /briefs
 * Список всех отправленных брифов (для admin-панели).
 */
router.get('/', async (_req, res) => {
  try {
    const submissions = await getAllSubmissions();
    res.json(submissions);
  } catch (err) {
    console.error('[BRIEFS] GET /briefs error:', err.message);
    res.status(500).json({ error: 'Не удалось получить список брифов' });
  }
});

/**
 * GET /briefs/:slug
 * Получить шаблон брифа по slug (публичный).
 */
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const brief = await getBriefBySlug(slug);
    res.json(brief);
  } catch (err) {
    if (err.code === 'PGRST116') {
      return res.status(404).json({ error: 'Бриф не найден' });
    }
    console.error('[BRIEFS] GET /:slug error:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * POST /briefs/:slug/submit
 * Сохранить ответы на бриф (публичный).
 * Body: { answers: [{question_id, question_text, answer}] }
 */
router.post('/:slug/submit', async (req, res) => {
  const { slug } = req.params;
  const { answers } = req.body;

  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'Поле answers обязательно и должно быть массивом' });
  }

  try {
    const submission = await saveBriefSubmission(slug, answers);
    res.status(201).json({ ok: true, id: submission.id });
  } catch (err) {
    console.error('[BRIEFS] POST /:slug/submit error:', err.message);
    res.status(500).json({ error: 'Не удалось сохранить бриф' });
  }
});

/**
 * POST /briefs/transcribe
 * Транскрибировать аудио через OpenAI Whisper.
 * Multipart: audio (file)
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл audio обязателен' });
  }

  const filePath = req.file.path;
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      language: 'ru',
    });
    res.json({ text: transcription.text });
  } catch (err) {
    console.error('[BRIEFS] POST /transcribe error:', err.message);
    res.status(500).json({ error: 'Ошибка транскрипции' });
  } finally {
    fs.unlink(filePath, () => {});
  }
});

export default router;
