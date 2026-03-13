-- Включить RLS на всех таблицах.
-- service_role обходит RLS по умолчанию (бэкенд продолжит работать).
-- anon и authenticated без политик = deny by default (защита от прямого доступа с anon key).

ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
