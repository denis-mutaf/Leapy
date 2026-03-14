'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadDocument, generateTitle, getDocuments, deleteDocument, askQuestion, searchDocuments } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UploadCloud, Loader2, RotateCw, Trash2, FileX, Sparkles, Send, Search } from 'lucide-react';

const ACCEPTED_TYPES = ['.pdf', '.docx', '.txt', '.html', '.md'];
const MAX_SIZE_MB = 20;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const STATUS = { idle: 'idle', uploading: 'uploading', success: 'success', error: 'error' };

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function Page() {
  const [refreshKey, setRefreshKey] = useState(0);

  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [titleGenerating, setTitleGenerating] = useState(false);
  const [status, setStatus] = useState(STATUS.idle);
  const [errorMsg, setErrorMsg] = useState('');
  const [successDoc, setSuccessDoc] = useState(null);
  const inputRef = useRef(null);
  const titleAbortRef = useRef(false);

  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const loadDocuments = useCallback(async () => {
    setDocumentsLoading(true);
    setListError('');
    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch (err) {
      setListError(err.message || 'Не удалось загрузить список документов');
    } finally {
      setDocumentsLoading(false);
    }
  }, []);
  useEffect(() => { loadDocuments(); }, [loadDocuments, refreshKey]);

  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState('');

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const validateFile = (f) => {
    if (!f) return 'Файл не выбран';
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext)) return `Неподдерживаемый формат. Допустимые: ${ACCEPTED_TYPES.join(', ')}`;
    if (f.size > MAX_SIZE_BYTES) return `Файл слишком большой. Максимум: ${MAX_SIZE_MB} МБ`;
    return null;
  };

  const handleFileSelect = (f) => {
    const err = validateFile(f);
    if (err) { setErrorMsg(err); setFile(null); return; }
    titleAbortRef.current = true;
    setFile(f);
    setTitle('');
    setErrorMsg('');
    setStatus(STATUS.idle);
    setSuccessDoc(null);
  };

  useEffect(() => {
    if (!file) { setTitleGenerating(false); return; }
    titleAbortRef.current = false;
    setTitleGenerating(true);
    generateTitle(file)
      .then((data) => {
        if (titleAbortRef.current) return;
        setTitle(data.title || '');
      })
      .catch(() => { if (!titleAbortRef.current) {} })
      .finally(() => { if (!titleAbortRef.current) setTitleGenerating(false); });
  }, [file]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  }, []);
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onInputChange = (e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); };

  const handleUpload = async (e) => {
    e?.preventDefault?.();
    const err = validateFile(file);
    if (err) { setErrorMsg(err); return; }
    setStatus(STATUS.uploading);
    setErrorMsg('');
    setSuccessDoc(null);
    try {
      const doc = await uploadDocument(file, title);
      setSuccessDoc(doc);
      setStatus(STATUS.success);
      setFile(null);
      setTitle('');
      if (inputRef.current) inputRef.current.value = '';
      setRefreshKey((k) => k + 1);
      loadDocuments();
    } catch (err) {
      setStatus(STATUS.error);
      setErrorMsg(err.message || 'Неизвестная ошибка при загрузке');
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setListError(err.message || 'Ошибка при удалении документа');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAsk = async (e) => {
    e?.preventDefault?.();
    if (!question.trim()) return;
    setAsking(true);
    setAskError('');
    setResult(null);
    try {
      const data = await askQuestion(question.trim());
      setResult(data);
    } catch (err) {
      setAskError(err.message || 'Ошибка при обращении к AI');
    } finally {
      setAsking(false);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault?.();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResults(null);
    try {
      const data = await searchDocuments(query.trim());
      setSearchResults(data);
    } catch (err) {
      setSearchError(err.message || 'Ошибка при выполнении поиска');
    } finally {
      setSearching(false);
    }
  };

  const answer = result?.answer;
  const sources = result?.sources;

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">База знаний</h1>
        <p className="text-muted-foreground mt-1">Управляй документами и задавай вопросы AI</p>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Загрузить документ</CardTitle>
          <CardDescription>PDF, DOCX, TXT, HTML, MD — до 20 МБ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary hover:bg-accent/30 transition-all duration-200"
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              className="hidden"
              onChange={onInputChange}
            />
            <UploadCloud className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            {file ? (
              <>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatSize(file.size)}</p>
                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={(ev) => { ev.stopPropagation(); setFile(null); setTitle(''); if (inputRef.current) inputRef.current.value = ''; }}>Убрать</Button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Перетащи файл или выбери с компьютера</p>
                <p className="text-xs text-muted-foreground mt-1">.pdf, .docx, .txt, .html, .md</p>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-title">Название документа <span className="text-muted-foreground">(необязательно)</span></Label>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={titleGenerating ? 'Генерация названия…' : 'Например: Прайс-лист 2026'} disabled={titleGenerating} />
          </div>

          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
          {status === STATUS.success && successDoc && <p className="text-sm text-green-600">✓ Документ загружен: {successDoc.title || successDoc.file_name}</p>}

          <Button onClick={handleUpload} disabled={status === STATUS.uploading || !file} className="w-full" size="lg">
            {status === STATUS.uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Загружаю...</> : <><UploadCloud className="mr-2 h-4 w-4" />Загрузить</>}
          </Button>
        </CardContent>
      </Card>

      {/* Documents Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Документы</CardTitle>
          <Button variant="ghost" size="icon" onClick={loadDocuments} disabled={documentsLoading}>
            <RotateCw className={`h-4 w-4 ${documentsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {listError && <p className="text-sm text-destructive mb-4">{listError}</p>}
          {documents.length === 0 && !documentsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileX className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Нет загруженных документов</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Документ</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Тип</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Размер</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Чанков</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Статус</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Загружен</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium truncate max-w-[200px]">{doc.title || doc.file_name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{doc.file_name}</div>
                      </td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs font-mono">{doc.file_type?.toUpperCase()}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{formatSize(doc.file_size)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{doc.chunk_count ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge className={doc.status === 'ready' ? 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10' : doc.status === 'processing' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/10' : 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10'} variant="outline">
                          {doc.status === 'ready' ? 'Готов' : doc.status === 'processing' ? 'Обработка' : 'Ошибка'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(doc.created_at)}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} disabled={deletingId === doc.id} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ask AI Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" />Спросить AI</CardTitle>
          <CardDescription>Задай вопрос — AI найдёт ответ в базе знаний</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Какие условия рассрочки у Select New Town?" className="resize-none flex-1" rows={3} />
            <Button onClick={handleAsk} disabled={asking || !question.trim()} className="self-end shrink-0">
              {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {askError && <p className="text-sm text-destructive">{askError}</p>}
          {answer && (
            <div className="animate-in slide-in-from-bottom-2 duration-200 space-y-3">
              <div className="bg-accent/50 rounded-xl p-5 text-sm leading-relaxed">{answer}</div>
              {sources?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Источники</p>
                  {sources.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs shrink-0">{Math.round(s.similarity * 100)}%</Badge>
                      <span className="line-clamp-2">{s.content_preview ?? s.content}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Test Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" />Тест поиска</CardTitle>
          <CardDescription>Семантический поиск по базе знаний (сырые чанки)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поисковый запрос..." onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)} className="flex-1" />
            <Button onClick={handleSearch} disabled={searching} variant="outline">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {searchError && <p className="text-sm text-destructive">{searchError}</p>}
          {searchResults?.length > 0 && (
            <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-200">
              {searchResults.map((r, i) => (
                <div key={i} className="rounded-lg border border-border p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{Math.round(r.similarity * 100)}%</Badge>
                    <span className="text-muted-foreground font-medium">{r.document_title}</span>
                  </div>
                  <p className="text-muted-foreground line-clamp-3 leading-relaxed">{r.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
