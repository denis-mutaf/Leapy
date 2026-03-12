# Leapy — Project Documentation

> Справочный документ для продолжения разработки в новом чате.
> Последнее обновление: март 2026 (актуально).

---

## Общее описание

**Leapy** — AI-сервис для компании **Isragrup** (застройщик, Кишинёв, Молдова).

Система:
1. Принимает вебхуки от АТС Moldcell Business PBX
2. Транскрибирует звонки через OpenAI Whisper
3. Анализирует разговор через Claude (Anthropic) — оценивает менеджера по 5 критериям, извлекает данные о клиенте
4. Сохраняет всё в Supabase (звонки, оценки, профили клиентов)
5. Публикует заметки и задачи в AmoCRM
6. RAG-система: база знаний из документов с семантическим поиском (pgvector)

---

## Репозитории

| Репо | Назначение | URL |
|------|-----------|-----|
| **Leapy** (бэкенд) | Express API + webhook + RAG | https://github.com/denis-mutaf/Leapy.git |
| **leapy-admin** (фронтенд) | Next.js админка для RAG | https://github.com/denis-mutaf/leapy-admin.git |

---

## Деплой

| Сервис | Платформа | URL |
|--------|-----------|-----|
| Бэкенд (Express) | Railway | https://leapy-production.up.railway.app |
| Фронтенд (Next.js admin) | Vercel | https://leapy.vercel.app |
| База данных | Supabase | проект `oznbosvtlrdwbnmonoie` |

---

## Стек

### Бэкенд (`/`)
- **Runtime:** Node.js 20, ES Modules (`"type": "module"`)
- **Framework:** Express 4
- **AI:** OpenAI (Whisper + GPT-4o-mini + text-embedding-3-small), Anthropic Claude (анализ звонков)
- **Database:** Supabase (PostgreSQL + pgvector)
- **Storage:** Supabase Storage
- **CRM:** AmoCRM API v4
- **Парсинг документов:** pdf-parse, mammoth (DOCX), встроенный (TXT/MD/HTML)
- **Деплой:** Railway, ветка `main`

### Фронтенд (`leapy-admin`)
- **Framework:** Next.js 15 (App Router), JavaScript (не TypeScript)
- **Стили:** Tailwind CSS 3 + CSS custom properties (градиенты бренда)
- **Шрифт:** Inter Tight (Google Fonts, через `next/font/google`)
- **Конфиги:** `postcss.config.cjs`, `tailwind.config.cjs` (`.cjs` из-за конфликта с корневым `"type": "module"`)
- **Деплой:** Vercel, ветка `main` репо `denis-mutaf/leapy-admin`

---

## Переменные окружения

### Бэкенд (Railway)
```
PBX_CRM_TOKEN=         # токен для валидации вебхука от АТС
OPENAI_API_KEY=        # для Whisper, GPT-4o-mini, embeddings
ANTHROPIC_API_KEY=     # для Claude — анализ звонков
AMO_LONG_TOKEN=        # долгосрочный токен AmoCRM
AMO_SUBDOMAIN=deniskosharny
SUPABASE_URL=https://oznbosvtlrdwbnmonoie.supabase.co
SUPABASE_SERVICE_KEY=  # service_role ключ Supabase
ALLOWED_ORIGINS=       # CORS (необязательно, если пусто — разрешает все)
```

### Фронтенд (Vercel)
```
NEXT_PUBLIC_API_URL=https://leapy-production.up.railway.app
```

---

## Структура бэкенда

```
index.js                  — точка входа, CORS middleware, маршруты
src/
├── webhook.js            — обработчик POST /webhook от АТС
├── analyze.js            — анализ звонка через Claude (JSON-ответ)
├── amocrm.js             — AmoCRM API: поиск, создание контактов/сделок, заметки, задачи
├── supabase.js           — все запросы к БД (клиенты, звонки, оценки, инсайты, аудио)
├── rag.js                — RAG-движок: парсинг, чанкинг, embeddings, поиск
└── rag-routes.js         — Express роуты для /rag/*
```

---

## API эндпоинты

### Webhook
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/webhook` | Приём вебхука от АТС PBX |
| GET | `/health` | Healthcheck |

### RAG
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/rag/documents` | Загрузка документа (multipart: `file`, `title`, `metadata`) |
| GET | `/rag/documents` | Список всех документов |
| GET | `/rag/documents/:id` | Получить документ |
| DELETE | `/rag/documents/:id` | Удалить документ + чанки |
| POST | `/rag/search` | Семантический поиск (`query`, `limit`, `threshold`) |
| POST | `/rag/generate-title` | Генерация названия документа через Claude (multipart: `file`) → `{ title }` |
| POST | `/rag/ask` | RAG Q&A: поиск по базе + ответ Claude (`question`, `limit`, `threshold`) → `{ answer, sources }` |

---

## База данных Supabase

**Проект:** `oznbosvtlrdwbnmonoie` (Leapy)

### Таблицы
| Таблица | Назначение |
|---------|-----------|
| `managers` | Менеджеры компании (поля: `name`, `amo_user_id`, `pbx_user`) |
| `clients` | Профили клиентов (телефон, имя, интересы, бюджет, источник и т.д.) |
| `calls` | Записи звонков (транскрипт, статус, тип, длительность, ссылка на аудио) |
| `evaluations` | Оценки звонков по 5 критериям (greeting, needs, presentation, objections, closing) |
| `call_insights` | Извлечённые данные из звонка (имя, тип недвижимости, бюджет и т.д.) |
| `documents` | Метаданные RAG-документов |
| `document_chunks` | Чанки с embeddings vector(1536) для семантического поиска |

### SQL-функции
- `increment_client_calls(client_id uuid)` — атомарный инкремент счётчика звонков
- `search_documents(query_embedding, match_count, similarity_threshold)` — семантический поиск через ivfflat

### Storage buckets
- `call-recordings` — приватный, MP3 записи звонков
- `rag-documents` — приватный, оригинальные загруженные файлы

### Данные
- Менеджер `Crina` (pbx_user: `u040`, id: `9c7c297f-29ba-4e6c-80fc-c39aeaff6a0c`)

---

## Логика обработки звонка (webhook.js)

```
POST /webhook
  │
  ├─ Валидация crm_token → 401 если не совпадает
  ├─ Фильтрация: status != "Success" OR duration < 10 OR нет link → 200 skip
  ├─ Ответ 200 сразу (PBX не ждёт)
  │
  ├─ Скачать MP3 → /tmp
  ├─ Загрузить в Supabase Storage (call-recordings)
  ├─ Whisper → транскрипт
  ├─ Найти/создать клиента в Supabase (по phone)
  ├─ Найти менеджера (по pbx_user из webhook)
  ├─ Создать запись call в Supabase
  │
  ├─ Claude анализ → JSON:
  │     client_name, summary (с эмодзи-секциями),
  │     tags[], has_next_step, next_step_text, next_step_deadline_days,
  │     score_greeting/needs/presentation/objections/closing,
  │     recommendations, extracted_* (property, budget, source, timeline...)
  │
  ├─ Сохранить evaluation в Supabase
  ├─ Сохранить call_insights в Supabase
  ├─ Обновить профиль клиента (имя, интересы, бюджет...)
  │
  ├─ AmoCRM:
  │     Найти/создать контакт по телефону
  │     Опубликовать заметку с резюме звонка
  │     Обновить имя контакта/сделки если узнали имя
  │     Обновить теги сделки
  │     Создать задачу если has_next_step
  │
  └─ Удалить temp MP3
```

---

## RAG-система (rag.js + rag-routes.js)

- **Модель эмбеддингов:** `text-embedding-3-small` (1536 dimensions)
- **Чанкинг:** 1500 символов, overlap 200 символов
- **Поиск:** cosine similarity через ivfflat индекс
- **Поддерживаемые форматы:** PDF, DOCX, TXT, HTML, MD (макс 20MB)
- **Хранение:** оригиналы в Supabase Storage `rag-documents`, чанки + embeddings в таблице `document_chunks`
- **Генерация названий:** Claude `claude-haiku-4-5-20251001`, первые 4000 символов документа → короткое название (2–8 слов)
- **Q&A (RAG Ask):** Claude `claude-haiku-4-5-20251001`, порог similarity по умолчанию 0.2, max_tokens 1000; отвечает только по контексту из базы знаний, если ничего не найдено — возвращает `sources: []` без галлюцинаций

---

## Компания Isragrup (контекст для промптов)

- Застройщик, Кишинёв (Дурлешты), 6 лет на рынке
- **Select New Town** — сдача 2028, 1 комн от €51,125, рассрочка до 7 лет
- **Next New Town** — сдача 2030, 1 комн от €43,010, рассрочка до 8 лет
- Первый взнос от 10%, рассрочка без процентов
- Офис: str. Cartușa 95/5, Durlești
- Телефоны: +373 61 030 040, +373 61 030 030
- AmoCRM поддомен: `deniskosharny`

---

## Ветки и CI/CD

- Бэкенд: Railway автодеплой из ветки `main` репо `denis-mutaf/Leapy`
- Фронтенд: Vercel автодеплой из ветки `main` репо `denis-mutaf/leapy-admin`

---

## Admin-панель (leapy-admin)

Расположена в папке `admin/` основного репо и в отдельном репо `denis-mutaf/leapy-admin`.

### Дизайн (фирменный стиль LeadLeap)

| Элемент | Значение |
|---------|----------|
| Шрифт | Inter Tight (400/500), `--font-inter-tight` |
| Основной текст | `#242424` |
| Фон страницы | `#FFFFFF` |
| Фон секций/карточек | `#F8F8F8` |
| Границы | `#E5E5E5` |
| Основной градиент | `linear-gradient(135deg, #E040A0, #C850C0, #8B5CF6, #6366F1)` |
| Мягкий градиент (hover) | `linear-gradient(135deg, rgba(224,64,160,0.08), rgba(139,92,246,0.08))` |
| Радиус карточек | 16px |
| Радиус кнопок | 12px |
| Радиус инпутов | 8px |

### Структура компонентов

```
admin/
├── app/
│   ├── layout.js          — Inter Tight, шапка (лого по центру), декор. блюр, футер
│   ├── page.js            — сборка всех секций
│   └── globals.css        — CSS-переменные градиентов, утилиты .btn-gradient, .bg-gradient-leadleap
├── components/
│   ├── UploadForm.jsx     — drag-and-drop зона, автогенерация названия через Claude
│   ├── DocumentList.jsx   — таблица документов, статусные бейджи, удаление
│   ├── AskAI.jsx          — раздел «Спросить AI» (RAG Q&A с источниками)
│   └── SearchTest.jsx     — тест семантического поиска (сырые чанки)
├── lib/
│   └── api.js             — функции: uploadDocument, getDocuments, deleteDocument,
│                            searchDocuments, generateTitle, askQuestion
├── public/
│   └── leadleap_logo.svg  — SVG логотип (замени на финальный файл)
├── tailwind.config.cjs    — расширен: цвета бренда, радиусы, шрифт
└── .env.local             — NEXT_PUBLIC_API_URL=https://leapy-production.up.railway.app
```

### Секции страницы (сверху вниз)

1. **Загрузка документа** — drag-and-drop зона с пунктирной градиентной рамкой; при выборе файла автоматически запускается генерация названия через `/rag/generate-title` (спиннер в поле)
2. **Документы** — таблица на карточке; бейджи статусов (Готов / Обработка / Ошибка); hover строк с мягким градиентом; подтверждение удаления
3. **Спросить AI** — поле вопроса + кнопка «Спросить»; ответ Claude на карточке с градиентным фоном; список источников с процентом совпадения
4. **Тест поиска** — семантический поиск, возвращает сырые чанки с бейджами схожести

---

## Что ещё не сделано / TODO

- [ ] Авторизация в админке (сейчас публичная)
- [ ] Дашборд с оценками менеджеров
- [ ] Страница профиля клиента
- [ ] Интеграция RAG в анализ звонков (поиск по базе знаний при обработке звонка)
- [ ] Уведомления менеджерам (Telegram/email)
- [ ] RLS в Supabase (сейчас отключён)
- [ ] Заменить `admin/public/leadleap_logo.svg` на финальный файл логотипа
