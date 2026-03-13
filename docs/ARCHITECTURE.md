# Архитектура Leapy

## Общая картина

```
Moldcell PBX
    │
    │  POST /webhook  (crm_token)
    ▼
┌─────────────────────────────────────────────────────┐
│              Leapy Backend (Express)                │
│                  Railway                            │
│                                                     │
│  webhook.js                                         │
│    ├── скачать MP3 → /tmp                           │
│    ├── OpenAI Whisper → транскрипт                  │
│    ├── analyze.js → Claude (резюме + оценка)        │
│    ├── supabase.js → сохранить всё в БД             │
│    └── amocrm.js → заметка / задача / теги          │
│                                                     │
│  rag-routes.js  (/rag/*)                            │
│    └── rag.js → парсинг / чанкинг / embeddings      │
└─────────────────────────────────────────────────────┘
         │                    │                  │
         ▼                    ▼                  ▼
   Supabase DB          Supabase Storage      AmoCRM API
   (PostgreSQL           (call-recordings,    deniskosharny
   + pgvector)           rag-documents)       .amocrm.ru

                              ▲
                              │  NEXT_PUBLIC_API_URL
                    ┌─────────────────────┐
                    │   leapy-admin        │
                    │   (Next.js, Vercel)  │
                    │   RAG-управление:    │
                    │   загрузка доков,    │
                    │   поиск, Q&A        │
                    └─────────────────────┘
```

## Поток обработки звонка

```
1. PBX отправляет POST /webhook сразу после завершения звонка
2. Бэкенд отвечает 200 немедленно (PBX не ждёт)
3. Асинхронно:
   a. Скачать MP3 по ссылке из PBX → /tmp
   b. Загрузить MP3 в Supabase Storage (call-recordings/<year>/<callid>.mp3)
   c. OpenAI gpt-4o-mini-transcribe → текст транскрипции
   d. Найти/создать клиента в БД по номеру телефона
   e. Найти менеджера в БД по pbx_user из вебхука
   f. Создать запись call (status: processing)
   g. Загрузить контекст из RAG-базы знаний (semantic search по транскрипту)
   h. Два параллельных вызова Claude (claude-haiku-4-5):
      - summarizeCall → резюме РОП-стиля (JSON)
      - evaluateManager → оценка 1-10 по 5 критериям (JSON)
   i. Сохранить evaluation + call_insights в БД
   j. Обновить профиль клиента
   k. AmoCRM: найти или создать контакт+сделку → заметка → теги → задача
4. Удалить MP3 из /tmp
```

## Поток загрузки документа в RAG

```
Admin UI
  │  POST /rag/documents (multipart: file + title)
  ▼
rag-routes.js
  ├── rag.processDocument()
  │     ├── extractText() — парсинг (PDF/DOCX/TXT/HTML/MD)
  │     ├── chunkText() — 1500 символов, overlap 200
  │     ├── OpenAI text-embedding-3-small → 1536-dim vectors
  │     ├── INSERT document в Supabase
  │     └── INSERT document_chunks (content + embedding)
  └── Загрузить оригинал в Supabase Storage (rag-documents/)
```

## Зависимости между модулями

```
index.js
  ├── webhook.js
  │     ├── analyze.js → rag.js (searchKnowledgeBase)
  │     ├── amocrm.js
  │     └── supabase.js
  └── rag-routes.js
        └── rag.js → supabase (через supabase-js напрямую)
```

## Внешние сервисы

| Сервис | Назначение | Credentials |
|--------|-----------|-------------|
| Moldcell Business PBX | Источник вебхуков, хранит MP3 | `PBX_CRM_TOKEN` для валидации |
| OpenAI | Транскрипция (gpt-4o-mini-transcribe) + embeddings (text-embedding-3-small) | `OPENAI_API_KEY` |
| Anthropic Claude | Резюме звонка + оценка менеджера (claude-haiku-4-5-20251001) | `ANTHROPIC_API_KEY` |
| Supabase | PostgreSQL + pgvector + Storage | `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` |
| AmoCRM | CRM: контакты, сделки, заметки, задачи, теги | `AMO_LONG_TOKEN` + `AMO_SUBDOMAIN` |
