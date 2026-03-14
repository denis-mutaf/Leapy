'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Sparkles, Loader2, Download, RefreshCw, MessageSquare, SendHorizontal, Plus, X, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const MODELS = [
  { key: 'nano-banana', label: 'Nano Banana', tag: 'Быстрый', tagClass: 'bg-gray-500/20 text-gray-700', desc: 'Высокий объём, низкая задержка' },
  { key: 'nano-banana-2', label: 'Nano Banana 2', tag: 'Рекомендуем', tagClass: 'bg-indigo-500/20 text-indigo-700', desc: 'Баланс скорости и качества' },
  { key: 'nano-banana-pro', label: 'Nano Banana Pro', tag: 'Pro', tagClass: 'bg-purple-500/20 text-purple-700', desc: 'Максимальное качество, точный текст' },
];

const FORMATS = [
  { value: '1:1', label: 'Пост' },
  { value: '9:16', label: 'Сторис' },
  { value: '16:9', label: 'Баннер' },
  { value: '4:5', label: 'Instagram' },
];

function FileDropZone({ title, accept, maxFiles, files, onFilesChange, className = '' }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const addFiles = useCallback(
    (newFiles) => {
      if (!newFiles?.length) return;
      const list = Array.from(newFiles);
      const combined = [...files, ...list].slice(0, maxFiles);
      onFilesChange(combined);
    },
    [files, maxFiles, onFilesChange]
  );

  const removeAt = useCallback(
    (index) => {
      const next = files.filter((_, i) => i !== index);
      onFilesChange(next);
    },
    [files, onFilesChange]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className={className}>
      <Label className="text-xs font-medium text-muted-foreground">{title}</Label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl py-4 px-3 text-center cursor-pointer hover:border-primary hover:bg-accent/30 transition-all duration-200 mt-1.5"
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => { addFiles(e.target.files || []); e.target.value = ''; }}
        />
        <span className="text-xs text-muted-foreground">Перетащи файлы или нажми для выбора</span>
        <span className="text-xs text-muted-foreground block">до {maxFiles} файлов</span>
      </div>
      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {files.map((file, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-md px-2 py-0.5 text-xs"
            >
              <span className="truncate max-w-[120px]">{file.name}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeAt(i); }}
                className="hover:opacity-80"
                aria-label="Удалить"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ColorPicker({ colors, setColors, addColor, removeColor, setColorAt }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Цвета бренда</Label>
        <Button variant="ghost" size="sm" onClick={addColor}>
          <Plus className="h-4 w-4 mr-1" />Добавить
        </Button>
      </div>
      {colors.length === 0 ? (
        <p className="text-xs text-muted-foreground mt-2">Добавь цвета — модель будет использовать их в креативе</p>
      ) : (
        <div className="space-y-2 mt-2">
          {colors.map((hex, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={hex}
                onChange={(e) => setColorAt(i, e.target.value)}
                placeholder="#000000"
                className="flex-1 min-w-0 font-mono text-sm"
              />
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeColor(i)} aria-label="Удалить">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreativesPage() {
  const [selectedModel, setSelectedModel] = useState('nano-banana-2');
  const [format, setFormat] = useState('1:1');
  const [brandbookFiles, setBrandbookFiles] = useState([]);
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [colors, setColors] = useState([]);
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [cta, setCta] = useState('');
  const [extraText, setExtraText] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [imageMime, setImageMime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modelUsed, setModelUsed] = useState(null);
  const [chatMode, setChatMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const resp = await fetch(`${API_URL}/creatives/history`);
      const data = await resp.json();
      if (resp.ok) setHistoryItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!API_URL) { setError('NEXT_PUBLIC_API_URL не задан'); return; }
    setError('');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('model', selectedModel);
      form.append('format', format);
      form.append('headline', headline);
      form.append('subheadline', subheadline);
      form.append('cta', cta);
      form.append('extraText', extraText);
      form.append('userPrompt', userPrompt);
      form.append('colors', JSON.stringify(colors));
      brandbookFiles.forEach((f) => form.append('brandbook', f));
      referenceFiles.forEach((f) => form.append('references', f));
      photoFiles.forEach((f) => form.append('photos', f));

      const res = await fetch(`${API_URL}/creatives/generate`, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || data.details || `Ошибка ${res.status}`);
        return;
      }
      setGeneratedImage(data.image ?? null);
      setImageMime(data.mimeType ?? 'image/png');
      setHistory(Array.isArray(data.history) ? data.history : []);
      setModelUsed(data.modelUsed ?? null);
      setChatMode(false);
      setChatLog([]);
      loadHistory();
    } catch (e) {
      setError(e.message || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, [
    selectedModel,
    format,
    headline,
    subheadline,
    cta,
    extraText,
    userPrompt,
    colors,
    brandbookFiles,
    referenceFiles,
    photoFiles,
  ]);

  const handleChat = useCallback(async () => {
    const msg = chatMessage.trim();
    if (!msg || !API_URL || chatLoading) return;
    setError('');
    setChatLog((prev) => [...prev, { role: 'user', text: msg }]);
    setChatMessage('');
    setChatLoading(true);
    try {
      const res = await fetch(`${API_URL}/creatives/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel, history, message: msg }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setChatLog((prev) => [
          ...prev,
          { role: 'error', text: data.error || `Ошибка ${res.status}` },
        ]);
        return;
      }
      setHistory(data.history ?? history);
      if (data.image) {
        setGeneratedImage(data.image);
        setImageMime(data.mimeType || 'image/png');
      }
      const modelText = data.textResponse ?? '';
      const modelImage = data.image ? true : false;
      setChatLog((prev) => [
        ...prev,
        { role: 'model', text: modelText, image: modelImage },
      ]);
    } catch (e) {
      setChatLog((prev) => [...prev, { role: 'error', text: e.message || 'Ошибка сети' }]);
    } finally {
      setChatLoading(false);
    }
  }, [API_URL, chatMessage, chatLoading, selectedModel, history]);

  const handleDownload = useCallback(() => {
    if (!generatedImage) return;
    const mime = imageMime || 'image/png';
    const dataUrl = `data:${mime};base64,${generatedImage}`;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `creative-${Date.now()}.png`;
    a.click();
  }, [generatedImage, imageMime]);

  const addColor = () => setColors((c) => [...c, '#000000']);
  const removeColor = (i) => setColors((c) => c.filter((_, j) => j !== i));
  const setColorAt = (i, hex) => setColors((c) => c.map((v, j) => (j === i ? hex : v)));

  const hasResult = !!generatedImage;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden w-full">
      {/* Left panel */}
      <aside className="w-[420px] shrink-0 border-r border-border bg-card flex flex-col">
        <ScrollArea className="flex-1 scrollbar-thin">
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold">Генератор</h2>

            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Модель</Label>
              <ToggleGroup
                type="single"
                value={selectedModel}
                onValueChange={(v) => v && setSelectedModel(v)}
                className="flex w-full gap-1 mt-2"
              >
                {MODELS.map((m) => (
                  <ToggleGroupItem
                    key={m.key}
                    value={m.key}
                    variant="outline"
                    className="flex-1 min-w-0 flex flex-col items-center justify-center h-auto py-2 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
                  >
                    <span className="font-medium leading-tight text-center">{m.label}</span>
                    <span className="text-xs opacity-70 leading-tight text-center">{m.tag}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Формат</Label>
              <ToggleGroup
                type="single"
                value={format}
                onValueChange={(v) => v && setFormat(v)}
                className="flex w-full gap-1 mt-2"
              >
                {FORMATS.map((f) => (
                  <ToggleGroupItem
                    key={f.value}
                    value={f.value}
                    variant="outline"
                    className="flex-1 min-w-0 flex flex-col items-center justify-center h-auto py-2 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
                  >
                    <span className="font-medium leading-tight">{f.value}</span>
                    <span className="text-xs opacity-70 leading-tight">{f.label}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <Separator />

            <FileDropZone
              title="Брендбук"
              accept="image/*,application/pdf"
              maxFiles={5}
              files={brandbookFiles}
              onFilesChange={setBrandbookFiles}
            />
            <FileDropZone
              title="Референсные креативы"
              accept="image/*"
              maxFiles={3}
              files={referenceFiles}
              onFilesChange={setReferenceFiles}
            />
            <FileDropZone
              title="Фото объекта / продукта"
              accept="image/*"
              maxFiles={5}
              files={photoFiles}
              onFilesChange={setPhotoFiles}
            />

            <Separator />

            <ColorPicker colors={colors} setColors={setColors} addColor={addColor} removeColor={removeColor} setColorAt={setColorAt} />

            <Separator />

            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Тексты</Label>
              <div className="space-y-3 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Заголовок</Label>
                  <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Select New Town — квартиры от €65 000" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Подзаголовок</Label>
                  <Input value={subheadline} onChange={(e) => setSubheadline(e.target.value)} placeholder="Дурлешты, Кишинёв. Сдача 2027." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">CTA</Label>
                  <Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Узнать цену" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Доп. текст / плашки</Label>
                  <Input value={extraText} onChange={(e) => setExtraText(e.target.value)} placeholder="Рассрочка без %" />
                </div>
              </div>
              <div className="space-y-1.5 mt-3">
                <Label className="text-xs text-muted-foreground">Дополнительный промпт</Label>
                <Textarea rows={3} className="resize-none" placeholder="Любые дополнительные инструкции для модели..." value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} />
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={loading} className="w-full" size="lg">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Генерирую...</> : <><Sparkles className="mr-2 h-4 w-4" />Сгенерировать</>}
            </Button>

            {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
          </div>
        </ScrollArea>
      </aside>

      {/* Right panel */}
      <section className="flex-1 flex flex-col overflow-hidden bg-background">
        {!hasResult && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <Sparkles className="w-16 h-16 text-muted-foreground/20" />
            <p className="text-muted-foreground text-sm">Заполни параметры и нажми «Сгенерировать»</p>
          </div>
        )}

        {loading && !hasResult && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Генерирую креатив...</p>
          </div>
        )}

        {hasResult && !loading && (
          <>
            <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-card shrink-0">
              <Badge variant="outline" className="font-mono text-xs">{modelUsed || selectedModel}</Badge>
              <div className="flex gap-2">
                <Button
                  variant={historyOpen ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setHistoryOpen((v) => !v)}
                >
                  <History className="h-4 w-4 mr-2" />
                  История
                </Button>
                <Button variant={chatMode ? 'default' : 'outline'} size="sm" onClick={() => setChatMode((v) => !v)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {chatMode ? 'Режим чата включён' : 'Дорабатывать в чате'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />Скачать
                </Button>
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading}>
                  <RefreshCw className="h-4 w-4 mr-2" />Перегенерировать
                </Button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex items-center justify-center p-8">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={generatedImage?.slice(-20)}
                    src={`data:${imageMime || 'image/png'};base64,${generatedImage}`}
                    alt="Сгенерированный креатив"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                  />
                </AnimatePresence>
              </div>

              {historyOpen && (
                <div className="w-[220px] shrink-0 border-l border-border flex flex-col bg-card">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <span className="text-sm font-medium">История</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setHistoryOpen(false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-2">
                      {historyLoading && (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {!historyLoading && historyItems.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-8">
                          Нет генераций
                        </p>
                      )}
                      {historyItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setGeneratedImage(null);
                            fetch(item.image_url)
                              .then((r) => r.blob())
                              .then((blob) => {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const base64 = reader.result.split(',')[1];
                                  setGeneratedImage(base64);
                                  setImageMime(blob.type || 'image/png');
                                };
                                reader.readAsDataURL(blob);
                              });
                          }}
                          className="cursor-pointer rounded-lg overflow-hidden border border-border hover:border-primary transition-colors group"
                        >
                          <div className="aspect-square bg-muted overflow-hidden">
                            <img
                              src={item.image_url}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="p-2 space-y-0.5">
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-[10px] px-1 py-0">{item.format || '—'}</Badge>
                              <Badge variant="outline" className="text-[10px] px-1 py-0">{item.model_key?.replace('nano-banana', 'NB') || '—'}</Badge>
                            </div>
                            {item.headline && (
                              <p className="text-[11px] text-muted-foreground truncate">{item.headline}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground opacity-60">
                              {new Date(item.created_at).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {chatMode && (
                <div className="w-[320px] border-l border-border flex flex-col bg-card shrink-0">
                  <div className="p-4 border-b border-border">
                    <p className="font-medium text-sm">Доработка</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Напиши что изменить</p>
                  </div>
                  <ScrollArea className="flex-1 p-4 scrollbar-thin">
                    {chatLog.length === 0 && !chatLoading && (
                      <p className="text-xs text-muted-foreground text-center mt-8">Например: «Сделай фон темнее»</p>
                    )}
                    <AnimatePresence>
                      {chatLog.map((entry, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                          className={
                            entry.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm ml-8 p-3 text-xs mb-2'
                              : entry.role === 'model'
                                ? 'bg-accent rounded-2xl rounded-bl-sm mr-8 p-3 text-xs mb-2'
                                : 'border border-destructive text-destructive text-xs p-3 rounded-lg mb-2'
                          }
                        >
                          {entry.text && <p className="whitespace-pre-wrap">{entry.text}</p>}
                          {entry.image && <p className="opacity-70 mt-1">[изображение обновлено]</p>}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {chatLoading && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <Loader2 className="h-4 w-4 animate-spin" />Обрабатываю...
                      </motion.div>
                    )}
                  </ScrollArea>
                  <div className="p-3 border-t border-border flex gap-2">
                    <Input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChat()}
                      placeholder="Что изменить?"
                      disabled={chatLoading}
                      className="flex-1"
                    />
                    <Button size="icon" onClick={handleChat} disabled={chatLoading || !chatMessage.trim()}>
                      <SendHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
