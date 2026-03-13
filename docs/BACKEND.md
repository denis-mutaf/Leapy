# Бэкенд — документация

## Стек

| Компонент | Технология |
|-----------|-----------|
| Runtime | Node.js 20, ES Modules (`"type": "module"`) |
| Framework | Express 4 |
| Транскрипция | OpenAI `gpt-4o-mini-transcribe` |
| Анализ | Anthropic Claude `claude-haiku-4-5-20251001` |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dim) |
| База данных | Supabase (PostgreSQL + pgvector) |
| Хранилище файлов | Supabase Storage |
| CRM | AmoCRM API v4 |
| Парсинг документов | pdf-parse, mammoth (DOCX), встроенный (TXT/MD/HTML) |
| Деплой | Railway, ветка `main` репо `denis-mutaf/Leapy` |

## Структура файлов

```
index.js              — точка входа: CORS, маршруты, проверка env
src/
├── webhook.js        — POST /webhook: скачать MP3 → транскрипт → анализ → БД → AMO
├── analyze.js        — два Claude-вызова: summarizeCall + evaluateManager
├── amocrm.js         — AmoCRM API: поиск/создание контактов, заметки, задачи, теги
├── supabase.js       — все запросы к Supabase
├── rag.js            — RAG-движок: парсинг, чанкинг, embeddings, поиск
└── rag-routes.js     — Express роуты /rag/*
```

## Переменные окружения

| Переменная | Назначение | Обязательная |
|-----------|-----------|:---:|
| `PBX_CRM_TOKEN` | Токен валидации вебхуков от АТС | ✅ |
| `OPENAI_API_KEY` | Транскрипция + embeddings | ✅ |
| `ANTHROPIC_API_KEY` | Claude — анализ звонков | ✅ |
| `GLADIA_API_KEY` | Зарезервирован (не используется) | ✅¹ |
| `AMO_LONG_TOKEN` | Долгосрочный токен AmoCRM | ✅ |
| `AMO_SUBDOMAIN` | Поддомен AmoCRM (`deniskosharny`) | ✅ |
| `SUPABASE_URL` | URL проекта Supabase | ✅ |
| `SUPABASE_SERVICE_KEY` | service_role ключ Supabase | ✅ |
| `ALLOWED_ORIGINS` | CORS-разрешённые origins (через запятую). Пусто = все | ❌ |
| `PORT` | Порт сервера (Railway задаёт автоматически) | ❌ |

> ¹ `GLADIA_API_KEY` присутствует в `REQUIRED_ENV` — если убрать оттуда, сервер стартует без него.

## API эндпоинты

### Системные

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/health` | Healthcheck → `{ status: "ok" }` |
| POST | `/webhook` | Приём вебхука от Moldcell PBX |

### RAG (`/rag/*`)

| Метод | Путь | Тело / Параметры | Ответ |
|-------|------|-----------------|-------|
| POST | `/rag/documents` | multipart: `file`, `title`, `metadata?` | `{ id, title, chunks_count }` |
| GET | `/rag/documents` | — | `[{ id, title, file_type, chunks_count, created_at }]` |
| GET | `/rag/documents/:id` | — | `{ id, title, ... }` |
| DELETE | `/rag/documents/:id` | — | `{ ok: true }` |
| POST | `/rag/search` | `{ query, limit?, threshold? }` | `{ results: [{ content, similarity, document_title }] }` |
| POST | `/rag/generate-title` | multipart: `file` | `{ title }` |
| POST | `/rag/ask` | `{ question, limit?, threshold? }` | `{ answer, sources: [{ document_title, content_preview, similarity }] }` |

### Webhook: входящие поля от PBX

```json
{
  "crm_token": "string",   // токен для валидации
  "callid": "string",      // уникальный ID звонка
  "type": "in|out",        // входящий / исходящий
  "status": "Success|...", // только Success обрабатывается
  "duration": "number",    // длительность в секундах (мин. 10)
  "phone": "string",       // номер клиента
  "link": "string",        // URL MP3-записи
  "user": "string",        // pbx_user менеджера (для поиска в БД)
  "ext": "string",
  "telnum": "string"
}
```

## База данных (Supabase)

**Проект:** `oznbosvtlrdwbnmonoie`

### Таблицы

#### `managers`
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `name` | text | Имя менеджера |
| `amo_user_id` | int | ID пользователя в AmoCRM |
| `pbx_user` | text | Логин в Moldcell PBX (для матчинга) |

#### `clients`
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `phone` | text | Номер телефона (уникальный) |
| `name` | text | Имя (заполняется из анализа) |
| `amo_contact_id` | int | ID контакта в AmoCRM |
| `total_calls` | int | Счётчик звонков |
| `desired_property` | text | Интерес к недвижимости |
| `budget` | text | Бюджет |
| `concerns` | text | Возражения/опасения |
| `source` | text | Источник (откуда узнал) |
| `timeline` | text | Желаемые сроки |
| `notes` | text | Дополнительные заметки |

#### `calls`
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `callid` | text | ID из PBX |
| `client_id` | uuid | FK → clients |
| `manager_id` | uuid | FK → managers (null если не найден) |
| `type` | text | `in` / `out` |
| `duration` | int | Секунды |
| `status` | text | `processing` → `completed` / `failed` |
| `transcript` | text | Транскрипция |
| `audio_path` | text | Путь в Supabase Storage |
| `amo_lead_id` | int | ID сделки в AmoCRM |

#### `evaluations`
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `call_id` | uuid | FK → calls |
| `manager_id` | uuid | FK → managers |
| `score_greeting` | int | 1-10 |
| `score_needs` | int | 1-10 |
| `score_presentation` | int | 1-10 |
| `score_objections` | int | 1-10 |
| `score_closing` | int | 1-10 |
| `score_total` | int | Среднее 1-10 |
| `recommendations` | text | Текст рекомендаций от Claude |
| `raw_analysis` | jsonb | Полный JSON ответ от analyze.js |

#### `call_insights`
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `call_id` | uuid | FK → calls |
| `client_id` | uuid | FK → clients |
| `extracted_name` | text | Имя клиента |
| `extracted_property` | text | Тип недвижимости |
| `extracted_budget` | text | Бюджет |
| `extracted_concerns` | text | Возражения |
| `extracted_source` | text | Источник |
| `extracted_timeline` | text | Сроки |
| `extracted_notes` | text | Прочее |

#### `documents`
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `title` | text | Название документа |
| `file_type` | text | pdf / docx / txt / html / md |
| `storage_path` | text | Путь в Supabase Storage |
| `metadata` | jsonb | Произвольные метаданные |
| `chunks_count` | int | Кол-во чанков |
| `created_at` | timestamptz | |

#### `document_chunks`
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | PK |
| `document_id` | uuid | FK → documents |
| `document_title` | text | Денормализовано для удобства |
| `content` | text | Текст чанка |
| `embedding` | vector(1536) | OpenAI embedding |
| `chunk_index` | int | Порядковый номер чанка |

### SQL-функции

```sql
-- Атомарный инкремент счётчика звонков клиента
increment_client_calls(client_id uuid)

-- Семантический поиск по чанкам (cosine similarity через ivfflat)
search_documents(query_embedding vector, match_count int, similarity_threshold float)
```

### Storage buckets

| Bucket | Приватность | Содержимое |
|--------|-------------|-----------|
| `call-recordings` | Приватный | MP3 записи звонков, путь: `<year>/<callid>.mp3` |
| `rag-documents` | Приватный | Оригинальные загруженные файлы |

## Логика analyze.js

Две независимые функции, запускаются параллельно через `Promise.all`:

### `summarizeCall`
- Модель: `claude-haiku-4-5-20251001`, max_tokens: 1500
- Промпт: SUMMARY_SYSTEM_PROMPT (роль РОПа)
- Контекст: `is_first_contact` + RAG + профиль клиента + предыдущие звонки
- Первый звонок: полный шаблон (клиент, запрос, финансы, возражения, след. шаг)
- Повторный звонок: только дельта (что нового, новые возражения, след. шаг)
- Возвращает JSON: `{ status, is_first_contact, summary_text, metadata }`

### `evaluateManager`
- Модель: `claude-haiku-4-5-20251001`, max_tokens: 800
- Промпт: EVALUATION_SYSTEM_PROMPT
- Оценивает 5 критериев по шкале 1-10: greeting, needs, presentation, objections, closing
- Возвращает JSON: `{ evaluation: { score_*, recommendations } }`

### Metadata из summarizeCall

```typescript
{
  temperature: "Горячий" | "Тёплый" | "Холодный",
  qualified: boolean,                    // только первый звонок
  disqualification_reason: string|null,
  client_name: string|null,
  interest: string|null,
  budget_mentioned: boolean,
  objections: string[],                  // первый звонок
  next_step: string|null,
  next_step_date: string|null,           // ISO date

  // только повторный звонок:
  temperature_changed: boolean,
  temperature_previous: string,
  new_info: string|null,
  new_objections: string[],
}
```

## AmoCRM: что делает бэкенд

1. Поиск контакта по телефону (`searchByPhone`) — пробует несколько форматов номера
2. Если не найден — создаёт контакт + сделку (`createContactWithLead`)
3. Публикует заметку с резюме + оценкой (`postNote`)
4. Обновляет имя контакта и сделки если Клод извлёк имя
5. При первом контакте: проставляет тег `"Квал"` если `qualified !== false`
6. Создаёт задачу если `has_next_step === true` (`createTask`)

## RAG-система

- **Чанкинг:** 1500 символов, overlap 200 символов
- **Модель embeddings:** `text-embedding-3-small`, 1536 dimensions
- **Поиск:** cosine similarity через ivfflat индекс в pgvector
- **Threshold по умолчанию:** 0.2 (поиск), 0.3 (SearchTest на фронте)
- **Контекст в анализе:** первые 500 символов транскрипта → semantic search → топ-3 чанка
- **Генерация названий:** Claude `claude-haiku-4-5-20251001`, первые 4000 символов

## Данные

| Сущность | Значение |
|----------|----------|
| Менеджер Crina | pbx_user: `u040`, id: `9c7c297f-29ba-4e6c-80fc-c39aeaff6a0c` |
| AmoCRM поддомен | `deniskosharny` |
| Supabase проект | `oznbosvtlrdwbnmonoie` |
