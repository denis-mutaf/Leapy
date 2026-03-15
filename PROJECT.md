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
7. **Генератор креативов:** генерация рекламных баннеров через Google Gemini (Nano Banana), загрузка в Supabase Storage, доработка в чате

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
- **AI:** OpenAI (Whisper + GPT-4o-mini + text-embedding-3-small), Anthropic Claude (анализ звонков), **Google Gemini** (генерация креативов: `@google/genai`)
- **Database:** Supabase (PostgreSQL + pgvector)
- **Storage:** Supabase Storage (call-recordings, rag-documents, **creative-images**)
- **CRM:** AmoCRM API v4
- **Парсинг документов:** pdf-parse, mammoth (DOCX), встроенный (TXT/MD/HTML)
- **Загрузка файлов:** multer (memoryStorage) для multipart
- **Деплой:** Railway, ветка `main`

### Фронтенд (`leapy-admin`)
- **Framework:** Next.js 15 (App Router), JavaScript (не TypeScript)
- **UI:** shadcn/ui (Zinc, CSS variables), next-themes (dark/light), framer-motion, lucide-react
- **Стили:** Tailwind CSS 3 + CSS custom properties (градиенты бренда, тёмная тема по умолчанию)
- **Шрифт:** Inter Tight (Google Fonts, через `next/font/google`)
- **Конфиги:** `postcss.config.cjs`, `tailwind.config.cjs`, `components.json` (shadcn)
- **Деплой:** Vercel, ветка `main` репо `denis-mutaf/leapy-admin`

---

## Переменные окружения

### Бэкенд (Railway)
```
PBX_CRM_TOKEN=         # токен для валидации вебхука от АТС
OPENAI_API_KEY=        # для Whisper, GPT-4o-mini, embeddings
ANTHROPIC_API_KEY=     # для Claude — анализ звонков
GEMINI_API_KEY=        # для генерации креативов (Nano Banana)
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
index.js                  — точка входа, CORS, маршруты: /webhook, /rag/*, /creatives/*
nixpacks.toml             — конфиг сборки (Nixpacks/Railway) при наличии
src/
├── webhook.js            — обработчик POST /webhook от АТС
├── analyze.js            — анализ звонка через Claude (JSON-ответ)
├── amocrm.js             — AmoCRM API: поиск, контакты/сделки, заметки, задачи
├── supabase.js           — все запросы к БД (клиенты, звонки, оценки, инсайты, аудио)
├── rag.js                — RAG-движок: парсинг, чанкинг, embeddings, поиск
├── rag-routes.js         — Express роуты для /rag/*
└── creatives.js          — роутер /creatives: генерация креативов (Gemini), чат, Storage, creative_generations
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

### Creatives (Gemini)
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/creatives/history` | Список генераций: `select=id,created_at,model_key,format,headline,image_url,image_size`, `order=created_at.desc`, `limit=50`. Ответ: массив записей из `creative_generations`. |
| POST | `/creatives/generate` | Генерация креатива: multipart **brandbook** (до 1), **photos** (до 3), **references** (до 5) — все поля только image/*; body: model, format, imageSize, headline, subheadline, cta, extraText, userPrompt, colors (JSON), **goals** (JSON), **systemPrompt** (опционально). В промпт передаются три группы: brandbook → «brand identity / brandbook», photos → «main composition photos», references → «reference creatives». Ответ: `{ id, image (base64), mimeType, textResponse, history, imageUrl, modelUsed }`. Загрузка в Storage `creative-images`, запись в `creative_generations`. |
| POST | `/creatives/chat` | Доработка в чате: JSON `{ model, history, message }`. Ответ: `{ image?, mimeType?, textResponse, history, imageUrl? }`. |

Модели (model key → Gemini): `nano-banana` → gemini-2.5-flash-image, `nano-banana-2` → gemini-3.1-flash-image-preview, `nano-banana-pro` → gemini-3-pro-image-preview.

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
| `creative_generations` | Записи сгенерированных креативов (model_key, model_id, format, headline, subheadline, cta, extra_text, user_prompt, colors, storage_path, image_url, **image_size**) |

### SQL-функции
- `increment_client_calls(client_id uuid)` — атомарный инкремент счётчика звонков
- `search_documents(query_embedding, match_count, similarity_threshold)` — семантический поиск через ivfflat

### Storage buckets
- `call-recordings` — приватный, MP3 записи звонков
- `rag-documents` — приватный, оригинальные загруженные файлы
- `creative-images` — публичный доступ к объектам, пути `creatives/<year>/<uuid>.png`

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

Расположена в папке `admin/` основного репо и в отдельном репо `denis-mutaf/leapy-admin`. **Метаданные:** title «Leapy», description «AI-сервис для анализа звонков и генерации креативов».

### Дизайн

- **UI:** shadcn/ui (default style, base color Zinc), CSS variables для темы
- **Тема:** next-themes, по умолчанию dark (`defaultTheme="dark"`, `enableSystem={false}`)
- **Шрифт:** Inter Tight (400/500), `--font-inter-tight`
- **Утилиты:** `.scrollbar-thin` в globals.css для тонкого скроллбара
- **Tailwind:** `theme.extend.colors` — shadcn (background, foreground, card, primary, muted, accent, destructive, border, input, ring и др.)
- **Сайдбар:** градиентный фон (`--sidebar-gradient` в :root и .light), вертикальный разделитель (`--sidebar-divider`), цвета текста/ховера/активного состояния через переменные (`--sidebar-text`, `--sidebar-hover`, `--sidebar-active`, `--sidebar-border`, `--sidebar-label`) для поддержки светлой и тёмной темы
- **Высота заголовков панелей:** единая константа `--panel-header-height: 57px` в globals.css; заголовки (сайдбар, галерея генераций, чат, модалка превью) выровнены по высоте

### Структура

```
admin/
├── app/
│   ├── layout.js            — ThemeProvider, Sidebar (collapsible), main (flex-1 min-h-0 flex flex-col)
│   ├── page.js              — «База знаний»: двухколоночный layout (flex). Левая колонка 380px: загрузка документа, Спросить AI (Textarea + ответ с источниками), Тест поиска; правая — таблица документов (скелетоны при загрузке, пустое состояние, motion.tr для строк). PageTransition, framer-motion (AnimatePresence для ответов). Запросы к @/lib/api.
│   ├── globals.css           — shadcn imports, :root/.light/.dark, scrollbar-thin, --panel-header-height, --sidebar-* переменные для сайдбара
│   └── creatives/
│       ├── layout.js        — контейнер flex flex-col flex-1 min-h-0 overflow-hidden для страницы креативов
│       ├── page.js          — генератор креативов: **двухпанельный layout**. Левая панель 400px («Генератор»): ScrollArea с блоками — модель/формат/разрешение/цель (кнопки), материалы (FileAttachButton: Лого 1, Композиция 3, Референсы 5), тексты (AutoResizeTextarea), промпт (Textarea), кнопка «Сгенерировать», ошибка. Правая панель — галерея (JustifiedGallery, скелетоны, пустое состояние) + чат (AnimatePresence, 320px) при «Доработать». Dialog превью (картинка, детали, Скачать/Доработать). Persistence: localStorage (ключ leapy_creatives_form, TTL 1 день), восстановление формы и файлов (base64) после монтирования. API: POST /creatives/generate (brandbook, photos, references, goals и др.), POST /creatives/chat, GET /creatives/history.
│       └── history/
│           └── page.js      — «История креативов»: GET /creatives/history, поиск, сетка карточек; из навигации убрана — история на /creatives
├── components/
│   ├── ui/                   — shadcn: button, card, input, textarea, label, badge, scroll-area, separator, tooltip, dialog, skeleton
│   ├── sidebar.jsx           — коллапсируемый сайдбар: фон var(--sidebar-gradient), разделитель var(--sidebar-divider), заголовок height var(--panel-header-height), цвета через --sidebar-*; лого, SidebarNav / CollapsedNav, ThemeToggle, footer Leapy © 2026
│   ├── theme-provider.jsx    — next-themes ThemeProvider
│   ├── theme-toggle.jsx      — переключатель светлая/тёмная тема
│   ├── nav-link.jsx          — ссылка навигации с иконкой, active по usePathname
│   ├── sidebar-nav.jsx       — NavLink x2: База знаний (/), Креативы (/creatives); заголовок «Навигация» (BookOpen, Sparkles)
│   ├── page-transition.jsx  — обёртка анимации переходов при наличии
│   └── …
├── lib/
│   ├── api.js                — uploadDocument, getDocuments, deleteDocument, searchDocuments, generateTitle, askQuestion
│   └── utils.js              — cn() для shadcn
├── public/
│   └── leadleap_logo.svg
├── next.config.js            — ESM (path, fileURLToPath), outputFileTracingRoot
├── tailwind.config.cjs       — shadcn colors (hsl(var(--*))), borderRadius, fontFamily
├── components.json           — shadcn (style default, baseColor zinc, cssVariables)
└── .env.local                — NEXT_PUBLIC_API_URL
```

### Навигация и страницы

- **Сайдбар:** коллапсируемый (`sidebar.jsx`): градиент и разделитель по CSS-переменным; лого, кнопка сворачивания; «Навигация» — «База знаний» (/, BookOpen), «Креативы» (/creatives, Sparkles); внизу Leapy © 2026 и ThemeToggle. В свёрнутом виде — только иконки с tooltip (CollapsedNav). Ссылка «История» убрана — история встроена в страницу Креативы.
- **Главная (/):** «База знаний» — двухколоночный layout: левая колонка 380px (загрузка документа, Спросить AI, Тест поиска), правая — таблица документов (скелетоны при загрузке, пустое состояние). Запросы к `@/lib/api` в `app/page.js`. PageTransition, framer-motion для анимации ответов.
- **Креативы (/creatives):** двухпанельный layout. **Левая панель (400px)** — «Генератор»: модель, формат, разрешение, цель (кнопки), материалы (Лого 1, Композиция 3, Референсы 5 — FileAttachButton), тексты, промпт, кнопка «Сгенерировать». **Правая панель** — галерея (JustifiedGallery), заголовок «Генерации», Refresh; чат 320px справа при «Доработать». Клик по карточке — Dialog превью (Скачать / Доработать). Форма и файлы сохраняются в localStorage (TTL 1 день). API: `POST /creatives/generate` (brandbook, photos, references, goals и др.), `POST /creatives/chat`, `GET /creatives/history`.
- **История креативов (/creatives/history):** страница сохранена (заголовок, счётчик, поиск, сетка карточек), из навигации убрана — список генераций отображается на /creatives.

---

## Последние изменения (креативы и админка)

- **Страница Креативы (/creatives):** двухпанельный layout: левая панель 400px («Генератор») с ScrollArea — модель, формат, разрешение, цель (кнопки), материалы (FileAttachButton: Лого 1, Пример композиции 3, Референсы 5), тексты (AutoResizeTextarea), промпт (Textarea), кнопка «Сгенерировать»; правая — галерея (JustifiedGallery, justified-layout), чат 320px при «Доработать». Persistence: localStorage (leapy_creatives_form, TTL 1 день), форма + файлы (base64); восстановление в useEffect после монтирования (гидрация без ошибок).
- **База знаний (/):** двухколоночный layout: левая 380px (загрузка, Спросить AI, Тест поиска), правая — таблица документов, скелетоны, motion.tr. PageTransition, AnimatePresence.
- **Сайдбар и темы:** globals.css — переменные сайдбара, --panel-header-height: 57px; навигация: База знаний, Креативы; коллапсируемый сайдбар; анимации диалога.
- **API креативов (src/creatives.js):** multer .fields([ brandbook maxCount 1, photos maxCount 3, references maxCount 5 ]), fileFilter — только image/* для всех полей; buildGenerateParts формирует три группы: brandbook → «brand identity / brandbook», photos → «main composition photos», references → «reference creatives» (каждая группа — inlineData + текст только при наличии файлов).

---

## Что ещё не сделано / TODO

- [ ] Авторизация в админке (сейчас публичная)
- [ ] Дашборд с оценками менеджеров
- [ ] Страница профиля клиента
- [ ] Интеграция RAG в анализ звонков (поиск по базе знаний при обработке звонка)
- [ ] Уведомления менеджерам (Telegram/email)
- [ ] RLS в Supabase (сейчас отключён)
- [ ] Заменить `admin/public/leadleap_logo.svg` на финальный файл логотипа
