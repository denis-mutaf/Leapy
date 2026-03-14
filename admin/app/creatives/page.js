'use client';

import { useCallback, useRef, useState } from 'react';

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
  { value: '1:4', label: 'Вертикаль' },
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
      <p className="text-sm font-medium text-text mb-2">{title}</p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          min-h-[88px] rounded-xl border-2 border-dashed transition-default cursor-pointer
          flex flex-col items-center justify-center gap-2 p-4
          ${dragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-border bg-section hover:border-indigo-400/50'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => { addFiles(e.target.files || []); e.target.value = ''; }}
        />
        <span className="text-sm text-text opacity-70">Перетащи файлы или нажми для выбора</span>
        <span className="text-xs text-text opacity-50">до {maxFiles} файлов</span>
      </div>
      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {files.map((file, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-section border border-border text-sm text-text"
            >
              <span className="truncate max-w-[140px]">{file.name}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeAt(i); }}
                className="text-text opacity-60 hover:opacity-100 hover:text-red-600 transition-default"
                aria-label="Удалить"
              >
                ×
              </button>
            </span>
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
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left panel */}
      <aside className="w-[420px] min-w-[380px] flex-shrink-0 overflow-y-auto border-r border-border bg-page p-6 space-y-6">
        <h1 className="text-2xl font-semibold text-text">Генератор креативов</h1>

        {/* Model selector */}
        <div>
          <p className="text-sm font-medium text-text mb-2">Модель</p>
          <div className="space-y-2">
            {MODELS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setSelectedModel(m.key)}
                className={`
                  w-full text-left rounded-2xl border-2 p-4 transition-default
                  ${selectedModel === m.key ? 'border-indigo-500 bg-indigo-500/10' : 'border-border bg-section hover:border-border/80'}
                `}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text">{m.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-lg ${m.tagClass}`}>{m.tag}</span>
                </div>
                <p className="text-sm text-text opacity-60 mt-1">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div>
          <p className="text-sm font-medium text-text mb-2">Формат</p>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(f.value)}
                className={`
                  px-4 py-2 rounded-xl border-2 text-sm font-medium transition-default
                  ${format === f.value ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700' : 'border-border bg-section text-text hover:border-border/80'}
                `}
              >
                {f.label} ({f.value})
              </button>
            ))}
          </div>
        </div>

        {/* File zones */}
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

        {/* Brand colors */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-text">Цвета бренда</p>
            <button
              type="button"
              onClick={addColor}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              + Добавить
            </button>
          </div>
          {colors.length === 0 ? (
            <p className="text-sm text-text opacity-50">Добавь цвета — модель будет использовать их в креативе</p>
          ) : (
            <div className="space-y-2">
              {colors.map((hex, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={hex}
                    onChange={(e) => setColorAt(i, e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                  />
                  <span className="font-mono text-sm text-text">{hex}</span>
                  <button
                    type="button"
                    onClick={() => removeColor(i)}
                    className="text-text opacity-60 hover:opacity-100 hover:text-red-600 ml-auto"
                    aria-label="Удалить"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Text fields */}
        <div>
          <p className="text-sm font-medium text-text mb-2">Тексты на креативе</p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Select New Town — квартиры от €65 000"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg bg-page text-text placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <input
              type="text"
              placeholder="Дурлешты, Кишинёв. Сдача 2027."
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg bg-page text-text placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <input
              type="text"
              placeholder="Узнать цену"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg bg-page text-text placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <input
              type="text"
              placeholder="Рассрочка без %"
              value={extraText}
              onChange={(e) => setExtraText(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg bg-page text-text placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-2">Дополнительный промпт</label>
          <textarea
            placeholder="Любые дополнительные инструкции для модели..."
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-border rounded-lg bg-page text-text placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-y"
          />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none transition-default flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Генерирую…
            </>
          ) : (
            <>✦ Сгенерировать</>
          )}
        </button>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}
      </aside>

      {/* Right panel */}
      <section className="flex-1 flex flex-col min-w-0 overflow-hidden bg-section">
        {!hasResult && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-text opacity-70">
            <span className="text-6xl">🍌</span>
            <p>Заполни параметры и нажми «Сгенерировать»</p>
          </div>
        )}

        {loading && !hasResult && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <span className="inline-block w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-text">Генерирую креатив...</p>
          </div>
        )}

        {hasResult && (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-page">
              <span className="text-xs font-mono text-text opacity-50 truncate mr-4">
                {modelUsed || selectedModel}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChatMode((v) => !v)}
                  className={`
                    px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-default
                    ${chatMode ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700' : 'border-border hover:border-indigo-400'}
                  `}
                >
                  {chatMode ? '💬 Режим чата включён' : '💬 Дорабатывать в чате'}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium border-2 border-border hover:bg-section transition-default"
                >
                  ↓ Скачать
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium bg-indigo-500/20 text-indigo-700 border-2 border-indigo-500/50 hover:bg-indigo-500/30 disabled:opacity-50 transition-default"
                >
                  ↺ Перегенерировать
                </button>
              </div>
            </div>

            <div className="flex-1 flex min-h-0">
              <div className="flex-1 flex items-center justify-center p-6 min-w-0">
                <img
                  src={`data:${imageMime || 'image/png'};base64,${generatedImage}`}
                  alt="Сгенерированный креатив"
                  className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                />
              </div>

              {chatMode && (
                <div className="w-[340px] flex-shrink-0 flex flex-col border-l border-border bg-page">
                  <div className="p-3 border-b border-border">
                    <h2 className="font-medium text-text">Доработка в чате</h2>
                    <p className="text-xs text-text opacity-60 mt-0.5">
                      Напиши что изменить — модель учтёт контекст
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {chatLog.length === 0 && !chatLoading && (
                      <p className="text-sm text-text opacity-50 text-center py-8">
                        Например: «Сделай фон темнее»
                      </p>
                    )}
                    {chatLog.map((entry, i) => (
                      <div
                        key={i}
                        className={`
                          rounded-xl p-3 text-sm
                          ${entry.role === 'user' ? 'ml-4 bg-indigo-600 text-white text-right' : ''}
                          ${entry.role === 'model' ? 'mr-4 bg-section border border-border text-left' : ''}
                          ${entry.role === 'error' ? 'mr-4 bg-red-50 border border-red-200 text-red-800 text-left' : ''}
                        `}
                      >
                        {entry.text && <p className="whitespace-pre-wrap">{entry.text}</p>}
                        {entry.image && <p className="text-text opacity-60 mt-1">[изображение обновлено]</p>}
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex items-center gap-2 text-text opacity-60 text-sm">
                        <span className="inline-block w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
                        Обрабатываю...
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-border flex gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChat()}
                      placeholder="Сообщение..."
                      disabled={chatLoading}
                      className="flex-1 px-4 py-2.5 border border-border rounded-lg bg-page text-text placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={handleChat}
                      disabled={chatLoading || !chatMessage.trim()}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-default"
                    >
                      →
                    </button>
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
