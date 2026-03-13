# Фронтенд (leapy-admin) — документация

## Репозиторий и деплой

| Параметр | Значение |
|---------|----------|
| Репо | `denis-mutaf/leapy-admin` |
| Деплой | Vercel, ветка `main` |
| URL | https://leapy.vercel.app |
| Папка в монорепо | `admin/` |

> Код фронтенда живёт **в двух местах**: в папке `admin/` основного репо (разработка) и в отдельном репо `leapy-admin` (деплой на Vercel). При изменениях нужно синхронизировать оба.

## Стек

| Компонент | Технология |
|-----------|-----------|
| Framework | Next.js 15 (App Router), JavaScript (не TypeScript) |
| Стили | Tailwind CSS 3 + CSS custom properties |
| Шрифт | Inter Tight (Google Fonts, через `next/font/google`) |
| Конфиги | `postcss.config.cjs`, `tailwind.config.cjs` (`.cjs` из-за конфликта с корневым `"type": "module"`) |
| API | fetch напрямую через `lib/api.js` |

## Переменные окружения

| Переменная | Значение | Где задаётся |
|-----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://leapy-production.up.railway.app` | Vercel + `.env.local` |

## Структура

```
admin/
├── app/
│   ├── layout.js          — Inter Tight, шапка (лого по центру), декор. блюр, футер
│   ├── page.js            — сборка секций: UploadForm → DocumentList → AskAI → SearchTest
│   └── globals.css        — CSS-переменные, .btn-gradient, .bg-gradient-leadleap
├── components/
│   ├── UploadForm.jsx     — drag-and-drop + автогенерация названия
│   ├── DocumentList.jsx   — таблица документов + удаление
│   ├── AskAI.jsx          — RAG Q&A (вопрос → ответ Claude + источники)
│   └── SearchTest.jsx     — сырой семантический поиск
├── lib/
│   └── api.js             — все вызовы к бэкенду
├── public/
│   └── leadleap_logo.svg  — логотип (заглушка, нужно заменить)
├── tailwind.config.cjs
└── .env.local
```

## Компоненты

### `UploadForm.jsx`
- Drag-and-drop зона с пунктирной градиентной рамкой
- При выборе файла автоматически вызывает `/rag/generate-title` → спиннер в поле названия
- После загрузки вызывает `onUploaded()` → обновляет список документов
- Поддерживает PDF, DOCX, TXT, HTML, MD (макс 20MB)

### `DocumentList.jsx`
- Таблица документов: название, тип, кол-во чанков, дата
- Статусные бейджи: Готов / Обработка / Ошибка
- Hover строк с мягким градиентом
- Кнопка удаления с подтверждением
- Реагирует на `refreshKey` пропс (обновляется после загрузки)

### `AskAI.jsx`
- Поле вопроса + кнопка «Спросить»
- Ответ Claude на карточке с градиентным фоном
- Список источников с процентом совпадения (similarity × 100)
- Вызывает `/rag/ask`

### `SearchTest.jsx`
- Поле запроса + кнопка поиска
- Возвращает сырые чанки с бейджами схожести
- Вызывает `/rag/search`

## lib/api.js — функции

```javascript
uploadDocument(file, title, metadata?)   // POST /rag/documents
getDocuments()                           // GET /rag/documents
deleteDocument(id)                       // DELETE /rag/documents/:id
searchDocuments(query, limit?, threshold?) // POST /rag/search → results[]
generateTitle(file)                      // POST /rag/generate-title → { title }
askQuestion(question, limit?, threshold?) // POST /rag/ask → { answer, sources[] }
```

Все функции используют `parseResponse(res)` — хелпер для единообразной обработки ошибок HTTP.

## Дизайн-система (LeadLeap brand)

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

CSS-классы из `globals.css`:
- `.btn-gradient` — кнопка с основным градиентом
- `.bg-gradient-leadleap` — фон с основным градиентом

## Секции страницы (сверху вниз)

1. **Загрузка документа** — `UploadForm`
2. **Документы** — `DocumentList`
3. **Спросить AI** — `AskAI`
4. **Тест поиска** — `SearchTest`

## Особенности конфигурации

Корневой `package.json` имеет `"type": "module"`, из-за чего конфиги Tailwind/PostCSS используют расширение `.cjs`, чтобы работать как CommonJS. Не менять расширения без необходимости.
