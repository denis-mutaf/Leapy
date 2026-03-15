'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/page-transition';
import { uploadDocument, generateTitle, getDocuments, deleteDocument, askQuestion, searchDocuments } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { UploadCloud, Loader2, RotateCw, Trash2, FileX, Sparkles, Send, Search, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <PageTransition>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left column */}
        <aside className="w-[380px] shrink-0 border-r border-border flex flex-col overflow-y-auto">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0" style={{ height: 'var(--panel-header-height)' }}>
            <h1 className="text-lg font-semibold">База знаний</h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Upload section */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Загрузить документ</p>
                <div
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onClick={() => inputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-accent/30 transition-all duration-200"
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    className="hidden"
                    onChange={onInputChange}
                  />
                  <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm">Перетащи или выбери файл</p>
                  <p className="text-xs text-muted-foreground">.pdf .docx .txt .html .md — до 20 МБ</p>
                </div>
                {file && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-accent rounded-lg text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate text-sm">{file.name}</span>
                    <button
                      type="button"
                      onClick={(ev) => { ev.stopPropagation(); setFile(null); setTitle(''); if (inputRef.current) inputRef.current.value = ''; }}
                      className="shrink-0 rounded p-0.5 hover:bg-muted transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <Input
                  id="doc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Название документа (необязательно)"
                  disabled={titleGenerating}
                />
                {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
                {status === STATUS.success && successDoc && <p className="text-sm text-green-600">✓ Документ загружен: {successDoc.title || successDoc.file_name}</p>}
                <Button onClick={handleUpload} disabled={status === STATUS.uploading || !file} className="w-full" size="lg">
                  {status === STATUS.uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Загружаю...</> : <><UploadCloud className="mr-2 h-4 w-4" />Загрузить</>}
                </Button>
              </div>

              <Separator />

              {/* Ask AI section */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Спросить AI
                </p>
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Какие условия рассрочки у Select New Town?"
                  rows={3}
                  className="resize-none"
                />
                <Button onClick={handleAsk} disabled={asking || !question.trim()} className="w-full">
                  {asking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Думаю...</> : <><Send className="mr-2 h-4 w-4" />Спросить</>}
                </Button>
                {askError && <p className="text-sm text-destructive">{askError}</p>}
                <AnimatePresence>
                  {answer && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      <div className="bg-accent/60 rounded-xl p-4 text-sm leading-relaxed">{answer}</div>
                      {sources?.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Источники</p>
                          {sources.map((s, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px] px-1.5 h-4 shrink-0">{Math.round(s.similarity * 100)}%</Badge>
                              <span className="line-clamp-2">{s.content_preview ?? s.content}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Separator />

              {/* Search section */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Search className="h-3.5 w-3.5" />
                  Тест поиска
                </p>
                <div className="flex gap-2">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поисковый запрос..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                    className="flex-1"
                  />
                  <Button size="icon" variant="outline" onClick={(e) => handleSearch(e)} disabled={searching}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {searchError && <p className="text-sm text-destructive">{searchError}</p>}
                <AnimatePresence>
                  {searchResults?.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      {searchResults.map((r, i) => (
                        <div key={i} className="rounded-lg border border-border p-3 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{Math.round(r.similarity * 100)}%</Badge>
                            <span className="text-xs font-medium text-muted-foreground truncate">{r.document_title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{r.content}</p>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </aside>

        {/* Right column */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 border-b border-border shrink-0 flex items-center justify-between" style={{ height: 'var(--panel-header-height)' }}>
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold">Документы</span>
              {documents.length > 0 && (
                <span className="text-sm text-muted-foreground">{documents.length} документов</span>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={loadDocuments} disabled={documentsLoading}>
              <RotateCw className={cn('h-4 w-4', documentsLoading && 'animate-spin')} />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {listError && <p className="text-sm text-destructive p-4">{listError}</p>}
            {documentsLoading && documents.length === 0 && (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background border-b border-border">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Документ</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Тип</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Размер</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Чанков</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Статус</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Загружен</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-3"><Skeleton className="h-4 w-48" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-6 rounded" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!documentsLoading && documents.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground min-h-[200px]">
                <FileX className="h-12 w-12 opacity-20" />
                <p className="text-sm">Нет загруженных документов</p>
                <p className="text-xs opacity-60">Загрузи первый документ слева</p>
              </div>
            )}
            {documents.length > 0 && (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background border-b border-border z-[1]">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Документ</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Тип</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Размер</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Чанков</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Статус</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Загружен</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {documents.map((doc) => (
                    <motion.tr
                      key={doc.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <p className="font-medium text-sm truncate max-w-[240px]">{doc.title || doc.file_name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[240px]">{doc.file_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] font-mono">{doc.file_type?.toUpperCase()}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatSize(doc.file_size)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{doc.chunk_count ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={doc.status === 'ready' ? 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10' : doc.status === 'processing' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/10' : 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10'}
                          variant="outline"
                        >
                          {doc.status === 'ready' ? 'Готов' : doc.status === 'processing' ? 'Обработка' : 'Ошибка'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(doc.created_at)}</td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
