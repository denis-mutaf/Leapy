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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/webhook', handleWebhook);

app.use('/rag', ragRoutes);
app.use('/briefs', briefsRoutes);

app.listen(PORT, () => {
  console.log(`[SERVER] AI Listener запущен на порту ${PORT}`);
  console.log(`[SERVER] RAG API доступен на /rag`);
});