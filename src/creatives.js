import { Router } from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';

const router = Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const MODEL_MAP = {
  'nano-banana': 'gemini-2.5-flash-image',
  'nano-banana-2': 'gemini-3.1-flash-image-preview',
  'nano-banana-pro': 'gemini-3-pro-image-preview',
};

const DEFAULT_MODEL_KEY = 'nano-banana-2';

function getModelId(modelKey) {
  return MODEL_MAP[modelKey] || MODEL_MAP[DEFAULT_MODEL_KEY];
}

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const memoryStorage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (file.mimetype?.startsWith('image/')) return cb(null, true);
  cb(new Error(`${file.fieldname}: only image/* allowed`));
}

const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter,
}).fields([
  { name: 'brandbook', maxCount: 1 },
  { name: 'photos', maxCount: 3 },
  { name: 'references', maxCount: 5 },
]);

/**
 * Build user prompt parts: images as inlineData, then text blocks in the required order.
 */
function buildGenerateParts(files, body) {
  const parts = [];
  const brandbook = files?.brandbook || [];
  const photos = files?.photos || [];
  const references = files?.references || [];

  if (brandbook.length > 0) {
    for (const file of brandbook) {
      parts.push({
        inlineData: {
          mimeType: file.mimetype || 'image/png',
          data: file.buffer.toString('base64'),
        },
      });
    }
    parts.push({
      text: 'Above: brand identity / brandbook. Use these colors, fonts, and visual style strictly.',
    });
  }

  if (photos.length > 0) {
    for (const file of photos) {
      parts.push({
        inlineData: {
          mimeType: file.mimetype || 'image/png',
          data: file.buffer.toString('base64'),
        },
      });
    }
    parts.push({
      text: 'Above: main composition photos. Use these as the primary visual content of the creative.',
    });
  }

  if (references.length > 0) {
    for (const file of references) {
      parts.push({
        inlineData: {
          mimeType: file.mimetype || 'image/png',
          data: file.buffer.toString('base64'),
        },
      });
    }
    parts.push({
      text: 'Above: existing reference creatives. Replicate their overall layout, composition, and visual style.',
    });
  }

  const format = body.format || '';
  let colors = [];
  try {
    if (body.colors && typeof body.colors === 'string') colors = JSON.parse(body.colors);
    else if (Array.isArray(body.colors)) colors = body.colors;
  } catch (_) {}
  const headline = body.headline || '';
  const subheadline = body.subheadline || '';
  const cta = body.cta || '';
  const extraText = body.extraText || '';
  const userPrompt = body.userPrompt || '';

  const industry = body.industry?.trim() || '';
  const language = body.language?.trim() || 'ru';
  const style = body.style?.trim() || 'minimal';
  const targetAudience = body.targetAudience?.trim() || '';
  const colorBackground = body.colorBackground?.trim() || '';
  const colorAccent = body.colorAccent?.trim() || '';
  const colorText = body.colorText?.trim() || '';
  const colorSecondary = body.colorSecondary?.trim() || '';
  const fonts = body.fonts?.trim() || '';

  const languageMap = {
    ru: 'Russian',
    ro: 'Romanian',
    en: 'English',
  };
  const styleMap = {
    minimal: 'clean minimalist — lots of white space, simple typography, restrained color palette',
    bold: 'bold and vibrant — strong colors, large typography, high energy, attention-grabbing',
    luxury: 'luxury premium — elegant typography, dark or gold tones, sophisticated layout, high-end feel',
    massmarket: 'mass market — friendly, accessible, clear messaging, broad appeal',
  };

  const systemLines = [
    'You are an expert advertising creative designer with 15+ years of experience creating high-converting ads.',
    '',
    'TASK: Create a production-ready advertising creative that can be directly uploaded to Facebook/Instagram Ads Manager.',
    '',
    '## REQUIREMENTS',
  ];

  if (industry) systemLines.push(`Industry: ${industry}`);
  if (targetAudience) systemLines.push(`Target audience: ${targetAudience}`);
  systemLines.push(`Visual style: ${styleMap[style] || styleMap.minimal}`);
  systemLines.push(`All text on the creative must be in: ${languageMap[language] || 'Russian'}`);

  const hasColors = colorBackground || colorAccent || colorText || colorSecondary;
  if (hasColors) {
    systemLines.push('MANDATORY COLOR ROLES — apply each color strictly to its designated role only:');
    if (colorBackground) systemLines.push(`- BACKGROUND: ${colorBackground} — use ONLY for main background surfaces. Do not use this color for text, buttons, or decorative elements.`);
    if (colorAccent) systemLines.push(`- ACCENT / CTA: ${colorAccent} — use ONLY for buttons, badges, price tags, discount labels, CTA elements, and highlights. This is the action color.`);
    if (colorText) systemLines.push(`- TEXT: ${colorText} — use ONLY for headlines, body text, and labels.`);
    if (colorSecondary) systemLines.push(`- SECONDARY: ${colorSecondary} — use for supporting elements, borders, icons, decorative shapes.`);
    systemLines.push('RULE: Do not mix these roles. Do not use accent color as background. Do not use background color as text. Each color has one job.');
  }

  systemLines.push('');
  systemLines.push('## DESIGN RULES');
  systemLines.push('- Follow the brandbook strictly if provided (colors, fonts, logo placement)');
  systemLines.push('- Use provided photos as the main visual content — do not replace or alter them');
  systemLines.push('- Replicate the layout and composition style from reference creatives if provided');
  systemLines.push('- All text must be legible, crisp, properly sized and positioned');
  systemLines.push('- The headline must be the most prominent text element');
  systemLines.push('- CTA must be clearly visible, preferably in a button or highlighted element');
  systemLines.push('- Do NOT add watermarks, placeholder text, lorem ipsum, or any text not specified');
  systemLines.push('- Do NOT add logos or brand elements not provided in the materials');
  systemLines.push('- Output must be pixel-perfect, ready for paid advertising — no drafts, no mockups');
  systemLines.push('');
  systemLines.push('## OUTPUT');
  systemLines.push('Return only the final creative image. No explanations, no variations, no text outside the image.');

  const lines = [`Aspect ratio / format: ${format}`];
  if (colors.length > 0) lines.push(`Brand colors — use these exactly: ${colors.join(', ')}`);
  if (headline) lines.push(`Main headline: "${headline}"`);
  if (subheadline) lines.push(`Subheadline: "${subheadline}"`);
  if (cta) lines.push(`CTA: "${cta}"`);
  if (extraText) lines.push(`Additional text / badges: "${extraText}"`);
  if (userPrompt) lines.push(`Additional instructions: ${userPrompt}`);

  // goals
  const goalsRaw = body.goals;
  let goals = [];
  try {
    if (typeof goalsRaw === 'string') goals = JSON.parse(goalsRaw);
    else if (Array.isArray(goalsRaw)) goals = goalsRaw;
  } catch (_) {}
  if (goals.length > 0) lines.push(`Creative goal(s): ${goals.join(', ')} — optimize the composition, message, and CTA for these objectives.`);
  if (fonts) lines.push(`FONTS — use exactly these typefaces: ${fonts}. Do not use any other fonts.`);

  // system prompt override or comprehensive default
  const systemPrompt = body.systemPrompt?.trim() || '';
  if (systemPrompt) {
    lines.push(systemPrompt);
  } else {
    lines.push(systemLines.join('\n'));
  }

  parts.push({ text: lines.join('\n') });
  return parts;
}

/**
 * Parse generateContent response: extract text and first inlineData image from first candidate.
 */
function parseGenerateResponse(response) {
  const textParts = [];
  let imageData = null;
  let mimeType = null;
  const candidate = response.candidates?.[0];
  const contentParts = candidate?.content?.parts || [];
  for (const part of contentParts) {
    if (part.text) textParts.push(part.text);
    if (part.inlineData && part.inlineData.data && !imageData) {
      imageData = part.inlineData.data;
      mimeType = part.inlineData.mimeType || 'image/png';
    }
  }
  const textResponse = textParts.join('\n').trim();
  return { textResponse, imageData, mimeType };
}

/**
 * Upload image buffer to Supabase Storage (REST), return public URL.
 * @param {Buffer} imageBuffer
 * @param {string} mimeType - e.g. image/png
 * @returns {{ storagePath: string, imageUrl: string }}
 */
async function uploadToSupabaseStorage(imageBuffer, mimeType = 'image/png') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required for storage upload');
  }
  const year = new Date().getFullYear();
  const uuid = crypto.randomUUID();
  const ext = mimeType === 'image/png' ? 'png' : 'png';
  const storagePath = `creatives/${year}/${uuid}.${ext}`;
  const url = `${SUPABASE_URL}/storage/v1/object/creative-images/${storagePath}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': mimeType,
      'x-upsert': 'true',
    },
    body: imageBuffer,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase Storage upload failed: ${res.status} ${errText}`);
  }

  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/creative-images/${storagePath}`;
  return { storagePath, imageUrl };
}

/**
 * Insert row into creative_generations via Supabase REST API.
 */
async function insertCreativeGeneration(record) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required for DB insert');
  }
  const url = `${SUPABASE_URL}/rest/v1/creative_generations`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase insert failed: ${res.status} ${errText}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

// ── POST /creatives/generate ───────────────────────────────────────────────────

router.post('/generate', (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  if (!ai) {
    return res.status(503).json({ error: 'Gemini API not configured (GEMINI_API_KEY missing)' });
  }

  const modelKey = (req.body?.model || DEFAULT_MODEL_KEY).trim() || DEFAULT_MODEL_KEY;
  const modelId = getModelId(modelKey);
  const parts = buildGenerateParts(req.files, req.body);

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: 'user', parts }],
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    });

    const { textResponse, imageData, mimeType } = parseGenerateResponse(response);

    if (!imageData) {
      return res.status(400).json({
        error: 'Model did not return an image',
        details: textResponse || 'No text or image in response',
      });
    }

    const imageBuffer = Buffer.from(imageData, 'base64');
    const { storagePath, imageUrl } = await uploadToSupabaseStorage(imageBuffer, mimeType);

    const colorBackground = req.body.colorBackground?.trim() || '';
    const colorAccent = req.body.colorAccent?.trim() || '';
    const colorText = req.body.colorText?.trim() || '';
    const colorSecondary = req.body.colorSecondary?.trim() || '';
    const colors = [colorBackground, colorAccent, colorText, colorSecondary].filter(Boolean);

    const row = {
      model_key: modelKey,
      model_id: modelId,
      format: req.body.format || null,
      headline: req.body.headline || null,
      subheadline: req.body.subheadline || null,
      cta: req.body.cta || null,
      extra_text: req.body.extraText || null,
      user_prompt: req.body.userPrompt || null,
      colors,
      storage_path: storagePath,
      image_url: imageUrl,
    };

    const inserted = await insertCreativeGeneration(row);
    const id = inserted?.id ?? null;

    const history = [
      { role: 'user', parts },
      {
        role: 'model',
        parts: [
          ...(textResponse ? [{ text: textResponse }] : []),
          { inlineData: { mimeType, data: imageData } },
        ],
      },
    ];

    res.status(200).json({
      id,
      image: imageData,
      mimeType,
      textResponse,
      history,
      imageUrl,
      modelUsed: modelId,
    });
  } catch (err) {
    console.error('[CREATIVES] generate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /creatives/chat ──────────────────────────────────────────────────────

router.post('/chat', async (req, res) => {
  if (!ai) {
    return res.status(503).json({ error: 'Gemini API not configured (GEMINI_API_KEY missing)' });
  }

  const { model: modelKey, history, message } = req.body || {};

  if (!Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: 'history must be a non-empty array' });
  }
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message must be a non-empty string' });
  }

  const modelId = getModelId((modelKey || DEFAULT_MODEL_KEY).trim() || DEFAULT_MODEL_KEY);
  const contents = [
    ...history,
    { role: 'user', parts: [{ text: message.trim() }] },
  ];

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents,
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    });

    const { textResponse, imageData, mimeType } = parseGenerateResponse(response);

    const modelParts = [];
    if (textResponse) modelParts.push({ text: textResponse });
    if (imageData) modelParts.push({ inlineData: { mimeType: mimeType || 'image/png', data: imageData } });
    const updatedHistory = [
      ...contents,
      { role: 'model', parts: modelParts },
    ];

    let imageUrl = null;
    if (imageData) {
      const imageBuffer = Buffer.from(imageData, 'base64');
      const { imageUrl: url } = await uploadToSupabaseStorage(imageBuffer, mimeType || 'image/png');
      imageUrl = url;
    }

    res.status(200).json({
      image: imageData ?? undefined,
      mimeType: mimeType ?? undefined,
      textResponse,
      history: updatedHistory,
      imageUrl: imageUrl ?? undefined,
    });
  } catch (err) {
    console.error('[CREATIVES] chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /creatives/history ─────────────────────────────────────────────────────

router.get('/history', async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL and SUPABASE_SERVICE_KEY are required' });
  }
  const url = `${SUPABASE_URL}/rest/v1/creative_generations?select=id,created_at,model_key,format,headline,image_url&order=created_at.desc&limit=50`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase request failed: ${response.status} ${errText}`);
    }
    const data = await response.json();
    res.status(200).json(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('[CREATIVES] history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
