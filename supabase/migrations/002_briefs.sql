-- Таблица брифов: шаблоны с вопросами
CREATE TABLE IF NOT EXISTS briefs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  questions   JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Таблица отправленных ответов
CREATE TABLE IF NOT EXISTS brief_submissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL REFERENCES briefs(slug) ON DELETE CASCADE,
  answers     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_submissions ENABLE ROW LEVEL SECURITY;

-- Пример брифа для тестирования
INSERT INTO briefs (slug, title, questions) VALUES (
  'furnicuta',
  'Бриф для разработки сайта',
  '[
    {"id": "company_name",    "question_text": "Как называется ваша компания?"},
    {"id": "activity",        "question_text": "Чем занимается ваша компания? Опишите основной вид деятельности."},
    {"id": "target_audience", "question_text": "Кто ваша целевая аудитория?"},
    {"id": "goal",            "question_text": "Какова главная цель нового сайта?"},
    {"id": "competitors",     "question_text": "Назовите 2–3 конкурентов, чьи сайты вам нравятся. Что именно нравится?"},
    {"id": "style",           "question_text": "Как бы вы описали желаемый стиль сайта?"},
    {"id": "pages",           "question_text": "Какие страницы или разделы должны быть на сайте?"},
    {"id": "deadline",        "question_text": "В какие сроки нужно запустить сайт?"}
  ]'
) ON CONFLICT (slug) DO NOTHING;
