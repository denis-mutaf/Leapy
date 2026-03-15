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

  const benefits = Array.isArray(body.benefits) ? body.benefits : [];
  if (benefits.length > 0) {
    const benefitsText = benefits.filter(b => b && String(b).trim()).map(b => `• ${b}`).join('\n');
    lines.push(`\nBENEFITS TO DISPLAY IN THE CREATIVE:\n${benefitsText}\nPlace these as visual trust elements (icons + text, badges, or a bullet list block) in the layout.`);
  }

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

/**
 * Trim chat history to limit size: keep last N turns and strip old image data.
 * Prevents huge base64 blobs from being sent back to the client.
 */
function trimHistory(history, maxTurns = 4) {
  const trimmed = history.slice(-maxTurns * 2);

  return trimmed.map((turn, index) => {
    const isLastModelTurn = index === trimmed.length - 1 && turn.role === 'model';
    if (isLastModelTurn) return turn;

    return {
      ...turn,
      parts: turn.parts?.map(part => {
        if (part.inlineData) {
          return { text: '[previous image]' };
        }
        return part;
      }) ?? turn.parts,
    };
  });
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
  const benefits = (() => {
    try { return JSON.parse(req.body.benefits || '[]'); } catch { return []; }
  })();
  req.body.benefits = benefits;
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

    const userPartsLean = parts.map(part =>
      part.inlineData ? { text: '[reference image]' } : part
    );

    const history = [
      { role: 'user', parts: userPartsLean },
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

  const { model: modelKey, history, message, contextImageUrl } = req.body || {};

  if (!Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: 'history must be a non-empty array' });
  }
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message must be a non-empty string' });
  }

  let resolvedHistory = history;
  if (contextImageUrl && Array.isArray(history) && history.length === 1) {
    try {
      const imgResp = await fetch(contextImageUrl);
      const imgBuffer = await imgResp.arrayBuffer();
      const imgBase64 = Buffer.from(imgBuffer).toString('base64');
      const mimeType = imgResp.headers.get('content-type') || 'image/png';
      resolvedHistory = [
        { role: 'user', parts: [{ text: 'Here is the creative to refine.' }] },
        { role: 'model', parts: [{ inlineData: { mimeType, data: imgBase64 } }] },
      ];
    } catch (e) {
      console.warn('[CREATIVES] Failed to fetch context image:', e.message);
    }
  }

  const modelId = getModelId((modelKey || DEFAULT_MODEL_KEY).trim() || DEFAULT_MODEL_KEY);
  const contents = [
    ...resolvedHistory,
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
      history: trimHistory(updatedHistory),
      imageUrl: imageUrl ?? undefined,
    });
  } catch (err) {
    console.error('[CREATIVES] chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /creatives/parse-product ──────────────────────────────────────────────

router.post('/parse-product', async (req, res) => {
  const { url, settings = {} } = req.body || {};
  if (!url?.trim()) return res.status(400).json({ error: 'URL is required' });

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LeapyBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ru,ro,en',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return res.status(422).json({
        error: `Не удалось загрузить страницу (${response.status}). Сайт может блокировать парсинг.`,
      });
    }

    const html = await response.text();

    const ogImage = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)?.[1]
      || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/)?.[1]
      || null;

    const styleDescriptions = {
      minimal: 'clean minimalist, lots of white space, simple composition',
      bold: 'bold and vibrant, high energy, strong contrast, eye-catching',
      luxury: 'luxury premium, elegant, sophisticated, high-end editorial',
      massmarket: 'friendly, accessible, warm, everyday lifestyle',
    };

    const goalDescriptions = {
      traffic: 'drive clicks and website visits',
      lead: 'generate leads and form submissions',
      awareness: 'build brand awareness and recognition',
      retargeting: 're-engage warm audience, remind of product',
    };

    const styleHint = styleDescriptions[settings.style] || 'clean and professional';
    const goalsHint = Array.isArray(settings.goals) && settings.goals.length > 0
      ? settings.goals.map((g) => goalDescriptions[g] || g).join(', ')
      : 'general advertising';
    const audienceHint = settings.targetAudience || 'general audience';
    const industryHint = settings.industry || '';
    const languageHint = settings.language || 'ru';
    const formatHint = settings.format || '1:1';

    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are an expert media buyer and creative director with 10 years of experience running Facebook and Instagram ad campaigns. Your job is to analyze a product page and extract everything needed to produce a high-converting ad creative.

Extract product information from this HTML and return ONLY a valid JSON object — no markdown, no backticks, no explanation.

Required fields:
{
  "name": "product name",
  "headline": "punchy ad headline, max 8 words, benefit-first, language: ${languageHint}",
  "subheadline": "one supporting sentence expanding the headline, max 15 words, language: ${languageHint}",
  "cta": "call to action — ru: Купить сейчас / ro: Cumpără acum / en: Buy Now",
  "extra_text": "discount label or urgency badge if present (e.g. -20%, Ultimele bucăți), otherwise empty string",
  "benefits": ["up to 4 short benefit strings found on the page, e.g. Livrare gratuită, Garanție 14 zile — empty array if none found"],
  "language": "${languageHint}",
  "image_url": "${ogImage || 'null'}",
  "visual_prompt": "see instructions below"
}

VISUAL PROMPT INSTRUCTIONS — write in English, max 220 chars:

You are a senior art director briefing an AI image generator. Think like both a performance marketer (what drives clicks?) and a visual designer (what makes a thumb stop scrolling?).

Your prompt must describe a complete ad scene, not just a product photo. Consider:
1. HERO ELEMENT: the product shown in its most aspirational use context
2. COMPOSITION: where does the product sit? (center, left third, foreground?) — leave deliberate negative space on one side for text overlay
3. SCENE & MOOD: background, lighting, time of day, setting — chosen to appeal to: ${audienceHint}
4. STYLE: apply ${styleHint} aesthetic to the scene
5. FORMAT: compose for ${formatHint} aspect ratio (e.g. 9:16 = vertical, text space at top/bottom; 4:5 = slight vertical; 1:1 = centered; 16:9 = wide, text left or right)

End with: "commercial photography, photorealistic, 4K, sharp focus, professional lighting, no text, no logos"

EXAMPLES of good visual prompts:
- "Modern wooden writing desk centered in bright minimalist home office, young woman working from left third, warm window light from right, open books and plant in background, deliberate empty upper zone for headline text, commercial photography, photorealistic, 4K, sharp focus, professional lighting, no text, no logos"
- "Premium hair straightener held by woman's hand close-up, soft studio bokeh background in warm beige tones, glossy product surface catching light, lower third empty for CTA placement, commercial photography, photorealistic, 4K, sharp focus, professional lighting, no text, no logos"

Ad context:
- Style: ${styleHint}
- Goal: ${goalsHint}
- Audience: ${audienceHint}
- Format: ${formatHint}
${industryHint ? `- Industry: ${industryHint}` : ''}

HTML (first 8000 chars):
${html.substring(0, 8000)}`,
        }],
      }),
    });

    if (!claudeResp.ok) {
      throw new Error('Claude API error');
    }

    const claudeData = await claudeResp.json();
    const raw = claudeData.content?.[0]?.text || '';
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    res.json(parsed);
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return res.status(422).json({ error: 'Сайт не отвечает (таймаут 10 сек). Попробуй позже.' });
    }
    if (err.message?.includes('JSON')) {
      return res.status(422).json({ error: 'Не удалось извлечь данные со страницы. Попробуй другой сайт.' });
    }
    console.error('[CREATIVES] parse-product error:', err.message);
    res.status(500).json({ error: 'Ошибка парсинга: ' + err.message });
  }
});

// ── POST /creatives/fetch-image ─────────────────────────────────────────────────

router.post('/fetch-image', async (req, res) => {
  const { url } = req.body || {};
  if (!url?.trim()) return res.status(400).json({ error: 'URL is required' });

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) {
      return res.status(422).json({ error: `Не удалось загрузить изображение (${response.status})` });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    if (!contentType.startsWith('image/')) {
      return res.status(422).json({ error: 'Ссылка не является изображением' });
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    res.json({ base64, mimeType: contentType, url });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return res.status(422).json({ error: 'Изображение не загрузилось (таймаут)' });
    }
    res.status(500).json({ error: 'Ошибка загрузки: ' + err.message });
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
