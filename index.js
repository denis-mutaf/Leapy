import 'dotenv/config';
import express from 'express';
import { handleWebhook } from './src/webhook.js';
import ragRoutes from './src/rag-routes.js';
import briefsRoutes from './src/briefs-routes.js';

const PORT = process.env.PORT || 3000;

const REQUIRED_ENV = ['PBX_CRM_TOKEN', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'AMO_LONG_TOKEN', 'AMO_SUBDOMAIN', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[STARTUP] Отсутствуют обязательные переменные окружения: ${missing.join(', ')}`);
  process.exit(1);
}

const app = express();

// CORS — разрешаем origins из ALLOWED_ORIGINS (запятая-разделённый список).
// Если ALLOWED_ORIGINS не задан — разрешаем все origins.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allow = allowedOrigins.length === 0 || (origin && allowedOrigins.includes(origin));
  if (allow && origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/webhook', handleWebhook);

app.use('/rag', ragRoutes);
app.use('/briefs', briefsRoutes);

app.listen(PORT, () => {
  console.log(`[SERVER] AI Listener запущен на порту ${PORT}`);
  console.log(`[SERVER] RAG API доступен на /rag`);
  console.log(`[SERVER] Briefs API доступен на /briefs`);
});