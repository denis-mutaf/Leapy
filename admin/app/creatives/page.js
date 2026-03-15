'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles, Loader2, Download, RefreshCw, MessageSquare, SendHorizontal, X, ImageOff, ImageIcon, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import justifiedLayout from 'justified-layout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const MODELS = [
  { key: 'nano-banana',     label: 'NB',     tag: 'Быстрый',     fullLabel: 'Nano Banana'     },
  { key: 'nano-banana-2',   label: 'NB 2',   tag: 'Рекомендуем', fullLabel: 'Nano Banana 2'   },
  { key: 'nano-banana-pro', label: 'NB Pro', tag: 'Качество',    fullLabel: 'Nano Banana Pro' },
];

const FORMATS = [
  { value: '1:1', label: 'Пост' },
  { value: '9:16', label: 'Сторис' },
  { value: '16:9', label: 'Баннер' },
  { value: '4:5', label: 'Instagram' },
];

const RESOLUTIONS = [
  { key: '0.5K', label: '0.5K', sub: 'Быстро' },
  { key: '1K', label: '1K', sub: 'Стандарт' },
  { key: '2K', label: '2K', sub: 'Высокое' },
  { key: '4K', label: '4K', sub: 'Максимум' },
];

const GOALS = [
  { value: 'traffic', label: 'Трафик', sub: 'Переходы' },
  { value: 'lead', label: 'Заявка', sub: 'Лид' },
  { value: 'awareness', label: 'Узнаваемость', sub: 'Бренд' },
  { value: 'retargeting', label: 'Ретаргетинг', sub: 'Догрев' },
];

const LANGUAGES = [
  { key: 'ru', label: 'RU' },
  { key: 'ro', label: 'RO' },
  { key: 'en', label: 'EN' },
];

const STYLES = [
  { key: 'minimal', label: 'Минимал', tag: 'Чисто' },
  { key: 'bold', label: 'Яркий', tag: 'Громко' },
  { key: 'luxury', label: 'Люкс', tag: 'Премиум' },
  { key: 'massmarket', label: 'Масс', tag: 'Широко' },
];

const MODEL_LABELS = {
  'nano-banana': 'NB',
  'nano-banana-2': 'NB 2',
  'nano-banana-pro': 'NB Pro',
};

function AutoResizeTextarea({ value, onChange, placeholder, className }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      className={cn(
        'flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm',
        'ring-offset-background placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'resize-none overflow-hidden min-h-[40px]',
        className
      )}
    />
  );
}

function FileAttachButton({ label, files, onFilesChange, maxFiles = 5, accept = 'image/*' }) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const previewUrls = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);
  useEffect(() => { return () => previewUrls.forEach(u => URL.revokeObjectURL(u)); }, [previewUrls]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addFiles = useCallback((newFiles) => {
    if (!newFiles?.length) return;
    const combined = [...files, ...Array.from(newFiles)].slice(0, maxFiles);
    onFilesChange(combined);
  }, [files, maxFiles, onFilesChange]);

  const removeAt = (i) => {
    onFilesChange(files.filter((_, idx) => idx !== i));
  };

  const isActive = files.length > 0;

  return (
    <div ref={ref} className="relative shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        className="hidden"
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
      />
      <button
        type="button"
        onClick={() => files.length > 0 ? setOpen(v => !v) : inputRef.current?.click()}
        className={cn(
          'flex items-center gap-1.5 px-3 h-9 rounded-xl text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-primary/10 text-primary border border-primary/30'
            : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
        )}
      >
        <ImageIcon className="h-3.5 w-3.5" />
        <span>{label}</span>
        {files.length > 0 && (
          <span className="h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-medium">
            {files.length}
          </span>
        )}
        {files.length > 0 && <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full mb-2 left-0 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden p-2"
            style={{ minWidth: 180 }}
          >
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {files.map((file, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden aspect-square bg-muted">
                  <img src={previewUrls[i]} alt={file.name} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
            {files.length < maxFiles && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5 border border-dashed border-border rounded-lg transition-colors"
              >
                + Добавить
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropdownButton({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = Array.isArray(value)
    ? options.filter(o => value.includes(o.value))
    : options.find(o => o.value === value);

  const displayLabel = Array.isArray(value)
    ? value.length > 0 ? value.map(v => options.find(o => o.value === v)?.label).join(', ') : label
    : selected?.label || label;

  const isActive = Array.isArray(value) ? value.length > 0 : !!value;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-3 h-9 rounded-xl text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-primary/10 text-primary border border-primary/30'
            : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
        )}
      >
        <span className="max-w-[100px] truncate">{displayLabel}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full mb-2 left-0 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[140px]"
          >
            {options.map(opt => {
              const isSelected = Array.isArray(value) ? value.includes(opt.value) : value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (Array.isArray(value)) {
                      onChange(isSelected ? value.filter(v => v !== opt.value) : [...value, opt.value]);
                    } else {
                      onChange(opt.value);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-accent',
                    isSelected && 'text-primary font-medium'
                  )}
                >
                  <div>
                    <div>{opt.label}</div>
                    {opt.sub && <div className="text-xs text-muted-foreground">{opt.sub}</div>}
                  </div>
                  {isSelected && <span className="text-primary ml-2">✓</span>}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function isValidHex(val) {
  return typeof val === 'string' && /^#[0-9A-Fa-f]{3,6}$/.test(val);
}

function ColorRow({ value, onChange, label }) {
  const colorInputRef = useRef(null);
  const valid = isValidHex(value);
  const handlePickerChange = (e) => {
    const hex = e.target.value;
    if (hex) onChange(hex);
  };
  return (
    <div className="flex items-center gap-2">
      {valid ? (
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 rounded-lg border border-border cursor-pointer bg-transparent p-0.5 shrink-0"
        />
      ) : (
        <>
          <input
            ref={colorInputRef}
            type="color"
            value="#ffffff"
            onChange={handlePickerChange}
            className="sr-only"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => colorInputRef.current?.click()}
            className="h-9 w-9 rounded-lg border border-dashed border-border bg-muted/50 shrink-0 cursor-pointer hover:bg-muted transition-colors"
            aria-label={label}
          />
        </>
      )}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#ffffff"
        className="flex-1 font-mono text-sm min-w-0"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="shrink-0 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Очистить"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
    </div>
  );
}

function JustifiedGallery({ items, onItemClick, onDownload }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const layout = containerWidth > 0 && items.length > 0
    ? justifiedLayout(
        items.map(item => {
          const format = item.format || '1:1';
          const [w, h] = format.split(':').map(Number);
          return (w && h) ? w / h : 1;
        }),
        {
          containerWidth,
          targetRowHeight: 220,
          boxSpacing: 8,
          containerPadding: 0,
        }
      )
    : null;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: layout ? layout.containerHeight : 'auto' }}>
      {layout && items.map((item, index) => {
        const box = layout.boxes[index];
        if (!box) return null;
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
            onClick={() => onItemClick(item)}
            className="absolute group cursor-pointer rounded-xl overflow-hidden border border-transparent hover:border-primary transition-all duration-150"
            style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
          >
            <img
              src={item.image_url}
              alt=""
              className="w-full h-full object-cover group-hover:brightness-75 transition-all duration-200"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); onDownload(item.image_url, item.id, e); }}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

const formatDate = (str) =>
  new Date(str).toLocaleDateString('ru', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const STORAGE_KEY = 'leapy_creatives_form';
const STORAGE_TTL = 24 * 60 * 60 * 1000; // 1 day

async function saveForm(data, files = {}) {
  try {
    const logoB64 = await filesToBase64(files.logoFiles || []);
    const compositionB64 = await filesToBase64(files.compositionFiles || []);
    const referencesB64 = await filesToBase64(files.referenceFiles || []);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...data,
      logoFiles: logoB64,
      compositionFiles: compositionB64,
      referenceFiles: referencesB64,
      _savedAt: Date.now(),
    }));
  } catch (_) {}
}

function loadForm() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data._savedAt || Date.now() - data._savedAt > STORAGE_TTL) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch (_) {
    return null;
  }
}

async function filesToBase64(files) {
  return Promise.all(files.map(file => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result });
    reader.readAsDataURL(file);
  })));
}

function base64ToFiles(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(({ name, type, data }) => {
    const byteString = atob(data.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new File([ab], name, { type });
  });
}

export default function CreativesPage() {
  const [selectedModel, setSelectedModel] = useState('nano-banana-2');
  const [format, setFormat] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [goals, setGoals] = useState([]);
  const [industry, setIndustry] = useState('');
  const [language, setLanguage] = useState('ru');
  const [style, setStyle] = useState('minimal');
  const [targetAudience, setTargetAudience] = useState('');
  const [colorBackground, setColorBackground] = useState('');
  const [colorAccent, setColorAccent] = useState('');
  const [colorText, setColorText] = useState('');
  const [colorSecondary, setColorSecondary] = useState('');
  const [fonts, setFonts] = useState('');
  const [logoFiles, setLogoFiles] = useState([]);
  const [compositionFiles, setCompositionFiles] = useState([]);
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [cta, setCta] = useState('');
  const [extraText, setExtraText] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [imageMime, setImageMime] = useState(null);
  const [activeGenerations, setActiveGenerations] = useState([]);
  const [error, setError] = useState('');
  const [modelUsed, setModelUsed] = useState(null);
  const [chatMode, setChatMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [activeChatItem, setActiveChatItem] = useState(null);
  const [productUrl, setProductUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrlLoading, setImageUrlLoading] = useState(false);
  const [imageUrlError, setImageUrlError] = useState('');

  useEffect(() => {
    const saved = loadForm();
    if (saved) {
      if (saved.selectedModel != null) setSelectedModel(saved.selectedModel);
      if (saved.format != null) setFormat(saved.format);
      if (saved.imageSize != null) setImageSize(saved.imageSize);
      if (Array.isArray(saved.goals)) setGoals(saved.goals);
      if (saved.industry != null) setIndustry(saved.industry);
      if (saved.language != null) setLanguage(saved.language);
      if (saved.style != null) setStyle(saved.style);
      if (saved.targetAudience != null) setTargetAudience(saved.targetAudience);
      if (saved.colorBackground != null) setColorBackground(saved.colorBackground);
      if (saved.colorAccent != null) setColorAccent(saved.colorAccent);
      if (saved.colorText != null) setColorText(saved.colorText);
      if (saved.colorSecondary != null) setColorSecondary(saved.colorSecondary);
      if (saved.fonts != null) setFonts(saved.fonts);
      if (saved.headline != null) setHeadline(saved.headline);
      if (saved.subheadline != null) setSubheadline(saved.subheadline);
      if (saved.cta != null) setCta(saved.cta);
      if (saved.extraText != null) setExtraText(saved.extraText);
      if (saved.userPrompt != null) setUserPrompt(saved.userPrompt);
      if (saved.logoFiles?.length) setLogoFiles(base64ToFiles(saved.logoFiles));
      if (saved.compositionFiles?.length) setCompositionFiles(base64ToFiles(saved.compositionFiles));
      if (saved.referenceFiles?.length) setReferenceFiles(base64ToFiles(saved.referenceFiles));
      if (saved.productUrl != null) setProductUrl(saved.productUrl);
      if (saved.imageUrl != null) setImageUrl(saved.imageUrl);
    }
  }, []);

  useEffect(() => {
    saveForm(
      {
        selectedModel,
        format,
        imageSize,
        goals,
        industry,
        language,
        style,
        targetAudience,
        colorBackground,
        colorAccent,
        colorText,
        colorSecondary,
        fonts,
        headline,
        subheadline,
        cta,
        extraText,
        userPrompt,
        productUrl,
        imageUrl,
      },
      { logoFiles, compositionFiles, referenceFiles }
    );
  }, [
    selectedModel,
    format,
    imageSize,
    goals,
    industry,
    language,
    style,
    targetAudience,
    colorBackground,
    colorAccent,
    colorText,
    colorSecondary,
    fonts,
    headline,
    subheadline,
    cta,
    extraText,
    userPrompt,
    productUrl,
    imageUrl,
    logoFiles,
    compositionFiles,
    referenceFiles,
  ]);

  const handleFetchImageUrl = useCallback(async (url) => {
    const targetUrl = url || imageUrl;
    if (!targetUrl?.trim() || !API_URL) return;
    setImageUrlLoading(true);
    setImageUrlError('');
    try {
      const res = await fetch(`${API_URL}/creatives/fetch-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImageUrlError(data.error || 'Не удалось загрузить изображение');
        return;
      }
      const byteString = atob(data.base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const file = new File([ab], 'product-image.png', { type: data.mimeType });
      setCompositionFiles((prev) => [file, ...prev].slice(0, 3));
    } catch (e) {
      setImageUrlError('Ошибка сети');
    } finally {
      setImageUrlLoading(false);
    }
  }, [imageUrl, API_URL]);

  const handleParseProduct = useCallback(async () => {
    if (!productUrl.trim() || !API_URL) return;
    setParsing(true);
    setParseError('');
    try {
      const res = await fetch(`${API_URL}/creatives/parse-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: productUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error || 'Ошибка парсинга');
        return;
      }
      if (data.headline) setHeadline(data.headline);
      if (data.subheadline) setSubheadline(data.subheadline);
      if (data.cta) setCta(data.cta);
      if (data.extra_text) setExtraText(data.extra_text);
      if (data.language) setLanguage(data.language);
      if (data.image_url && data.image_url !== 'null') {
        setImageUrl(data.image_url);
        handleFetchImageUrl(data.image_url);
      }
    } catch (e) {
      setParseError('Ошибка сети. Проверь подключение.');
    } finally {
      setParsing(false);
    }
  }, [productUrl, API_URL, handleFetchImageUrl]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const resp = await fetch(`${API_URL}/creatives/history`);
      if (resp.ok) setHistoryItems(await resp.json());
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
    if (!API_URL) {
      setError('NEXT_PUBLIC_API_URL не задан');
      return;
    }
    setError('');
    const genId = crypto.randomUUID();
    setActiveGenerations((prev) => [...prev, { id: genId, status: 'loading', format }]);

    const form = new FormData();
    form.append('model', selectedModel);
    form.append('format', format);
    form.append('imageSize', imageSize);
    form.append('headline', headline);
    form.append('subheadline', subheadline);
    form.append('cta', cta);
    form.append('extraText', extraText);
    form.append('userPrompt', userPrompt);
    form.append('goals', JSON.stringify(goals));
    form.append('industry', industry);
    form.append('language', language);
    form.append('style', style);
      form.append('targetAudience', targetAudience);
      form.append('colorBackground', colorBackground);
      form.append('colorAccent', colorAccent);
      form.append('colorText', colorText);
      form.append('colorSecondary', colorSecondary);
      form.append('fonts', fonts);
    logoFiles.forEach((f) => form.append('brandbook', f));
    compositionFiles.forEach((f) => form.append('photos', f));
    referenceFiles.forEach((f) => form.append('references', f));

    try {
      const res = await fetch(`${API_URL}/creatives/generate`, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActiveGenerations((prev) => prev.filter((g) => g.id !== genId));
        setError(data.error || data.details || `Ошибка ${res.status}`);
        return;
      }
      setActiveGenerations((prev) => prev.map((g) => (g.id === genId ? { ...g, status: 'done' } : g)));
      setGeneratedImage(data.image ?? null);
      setImageMime(data.mimeType ?? 'image/png');
      setHistory(Array.isArray(data.history) ? data.history : []);
      setModelUsed(data.modelUsed ?? null);
      setChatMode(false);
      setChatLog([]);
      await loadHistory();
      setTimeout(() => {
        setActiveGenerations((prev) => prev.filter((g) => g.id !== genId));
      }, 1000);
    } catch (e) {
      setActiveGenerations((prev) => prev.filter((g) => g.id !== genId));
      setError(e.message || 'Ошибка сети');
    }
  }, [
    selectedModel,
    format,
    imageSize,
    headline,
    subheadline,
    cta,
    extraText,
    userPrompt,
    goals,
    industry,
    language,
    style,
    targetAudience,
    colorBackground,
    colorAccent,
    colorText,
    colorSecondary,
    fonts,
    logoFiles,
    compositionFiles,
    referenceFiles,
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
        body: JSON.stringify({
          model: selectedModel,
          history,
          message: msg,
          contextImageUrl: activeChatItem?.image_url || null,
        }),
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
  }, [API_URL, chatMessage, chatLoading, selectedModel, history, activeChatItem?.image_url]);

  const handleDownload = useCallback(() => {
    if (!generatedImage) return;
    const mime = imageMime || 'image/png';
    const dataUrl = `data:${mime};base64,${generatedImage}`;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `creative-${Date.now()}.png`;
    a.click();
  }, [generatedImage, imageMime]);

  const handleDownloadUrl = async (url, id, e) => {
    e?.stopPropagation();
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `creative-${id.slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(objUrl);
    } catch (err) {
      console.error(err);
    }
  };

  const showEmptyState = activeGenerations.length === 0 && historyItems.length === 0;

  return (
  <motion.div
    className="flex flex-1 min-h-0 overflow-hidden w-full"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.15, ease: 'easeOut' }}
  >
    {/* LEFT PANEL — constructor */}
    <aside className="w-[400px] shrink-0 flex flex-col min-h-0 bg-background border-r border-border">
      <div className="px-6 border-b border-border shrink-0 flex items-center" style={{ height: 'var(--panel-header-height)' }}>
        <h2 className="text-lg font-semibold">Генератор</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-6 py-5 space-y-5">

          {/* URL Parser */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Автозаполнение по ссылке товара
            </label>
            <div className="flex gap-2 mt-2">
              <Input
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://topmag.md/product/..."
                className="flex-1 text-sm"
                disabled={parsing}
              />
              <Button
                type="button"
                size="sm"
                disabled={parsing || !productUrl.trim()}
                onClick={handleParseProduct}
                className="shrink-0"
              >
                {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              </Button>
            </div>
            {parseError && (
              <div className="mt-2 flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-3">
                <span className="flex-1">{parseError}</span>
                <button type="button" onClick={() => setParseError('')} className="shrink-0">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Model */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Модель</label>
            <div className="flex gap-2 mt-2">
              {MODELS.map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelectedModel(m.key)}
                  className={cn(
                    'flex-1 flex flex-col items-center justify-center gap-0.5 h-14 rounded-xl border text-center transition-colors duration-150 px-2',
                    selectedModel === m.key
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-transparent text-foreground border-border hover:border-foreground/40'
                  )}
                >
                  <span className="text-sm font-medium">{m.label}</span>
                  <span className="text-[11px] opacity-50">{m.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Формат</label>
            <div className="flex gap-2 mt-2">
              {FORMATS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormat(f.value)}
                  className={cn(
                    'flex-1 flex flex-col items-center justify-center gap-0.5 h-14 rounded-xl border text-center transition-colors duration-150 px-2',
                    format === f.value
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-transparent text-foreground border-border hover:border-foreground/40'
                  )}
                >
                  <span className="text-sm font-medium">{f.value}</span>
                  <span className="text-[11px] opacity-50">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Разрешение</label>
            <div className="flex gap-2 mt-2">
              {RESOLUTIONS.map(r => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setImageSize(r.key)}
                  className={cn(
                    'flex-1 flex flex-col items-center justify-center gap-0.5 h-14 rounded-xl border text-center transition-colors duration-150 px-2',
                    imageSize === r.key
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-transparent text-foreground border-border hover:border-foreground/40'
                  )}
                >
                  <span className="text-sm font-medium">{r.label}</span>
                  <span className="text-[11px] opacity-50">{r.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Цель</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoals(prev => prev.includes(g.value) ? prev.filter(v => v !== g.value) : [...prev, g.value])}
                  className={cn(
                    'flex-1 flex flex-col items-center justify-center gap-0.5 h-14 rounded-xl border text-center transition-colors duration-150 px-2',
                    goals.includes(g.value)
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-transparent text-foreground border-border hover:border-foreground/40'
                  )}
                >
                  <span className="text-sm font-medium">{g.label}</span>
                  <span className="text-[11px] opacity-50">{g.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Industry */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Отрасль / Бизнес</label>
            <Input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Недвижимость, одежда, ресторан..."
              className="mt-2"
            />
          </div>

          {/* Language */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Язык креатива</label>
            <div className="flex gap-2 mt-2">
              {LANGUAGES.map(l => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setLanguage(l.key)}
                  className={cn(
                    'flex-1 flex flex-col items-center justify-center gap-0.5 h-14 rounded-xl border text-center transition-colors duration-150 px-2',
                    language === l.key
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-transparent text-foreground border-border hover:border-foreground/40'
                  )}
                >
                  <span className="text-sm font-medium">{l.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Стиль</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {STYLES.map(s => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStyle(s.key)}
                  className={cn(
                    'flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 h-14 rounded-xl border text-center transition-colors duration-150 px-2',
                    style === s.key
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-transparent text-foreground border-border hover:border-foreground/40'
                  )}
                >
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="text-[11px] opacity-50">{s.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Target audience */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Целевая аудитория</label>
            <Input
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Семьи 25-45 лет, покупатели недвижимости..."
              className="mt-2"
            />
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Цвета</label>
            <div className="space-y-2 mt-2">
              <ColorRow value={colorBackground} onChange={setColorBackground} label="Фон" />
              <ColorRow value={colorAccent} onChange={setColorAccent} label="Акцент / CTA" />
              <ColorRow value={colorText} onChange={setColorText} label="Текст" />
              <ColorRow value={colorSecondary} onChange={setColorSecondary} label="Доп." />
            </div>
          </div>

          {/* Fonts */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Шрифты</label>
            <Input
              value={fonts}
              onChange={(e) => setFonts(e.target.value)}
              placeholder="Montserrat Bold — заголовки, Inter Regular — текст"
              className="mt-2"
            />
          </div>

          <div className="h-px bg-border" />

          {/* File attachments */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Материалы</label>
            <div className="flex flex-col gap-2">
              <FileAttachButton label="Лого" files={logoFiles} onFilesChange={setLogoFiles} maxFiles={1} />
              <FileAttachButton label="Пример композиции" files={compositionFiles} onFilesChange={setCompositionFiles} maxFiles={3} />
              <div className="flex gap-2 items-center">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://site.com/image.webp"
                  className="flex-1 text-sm"
                  disabled={imageUrlLoading}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="shrink-0 h-9 w-9"
                  disabled={imageUrlLoading || !imageUrl.trim()}
                  onClick={() => handleFetchImageUrl(imageUrl)}
                >
                  {imageUrlLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Download className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {imageUrlError && (
                <p className="text-xs text-destructive">{imageUrlError}</p>
              )}
              <FileAttachButton label="Референсы" files={referenceFiles} onFilesChange={setReferenceFiles} maxFiles={5} />
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Texts */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Тексты</label>
            <div className="space-y-2 mt-2">
              <AutoResizeTextarea value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Заголовок" />
              <AutoResizeTextarea value={subheadline} onChange={(e) => setSubheadline(e.target.value)} placeholder="Подзаголовок" />
              <AutoResizeTextarea value={cta} onChange={(e) => setCta(e.target.value)} placeholder="CTA" />
              <AutoResizeTextarea value={extraText} onChange={(e) => setExtraText(e.target.value)} placeholder="Доп. текст / плашки" />
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Промпт</label>
            <Textarea
              rows={4}
              className="resize-none mt-2 text-sm"
              placeholder="Дополнительные инструкции для модели..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
            />
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            className="w-full h-11 rounded-xl font-medium text-sm transition-all duration-200 text-white flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)',
              boxShadow: '0 0 20px rgba(168,85,247,0.4)',
            }}
          >
            {activeGenerations.length > 0 ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Генерирую ({activeGenerations.length})...</>
            ) : (
              <><Sparkles className="h-4 w-4" />Сгенерировать</>
            )}
          </button>

          {error && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-3">
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError('')} className="shrink-0 p-0.5 rounded hover:bg-destructive/20" aria-label="Закрыть">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

        </div>
      </ScrollArea>
    </aside>

    {/* RIGHT PANEL — gallery + chat */}
    <section className="flex-1 flex min-h-0 overflow-hidden">

      {/* Gallery */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-6 border-b border-border shrink-0 flex items-center justify-between" style={{ height: 'var(--panel-header-height)' }}>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Генерации</h2>
            {historyItems.length > 0 && (
              <span className="text-sm text-muted-foreground">{historyItems.length} работ</span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={loadHistory}>
            <RefreshCw className={cn('h-4 w-4', historyLoading && 'animate-spin')} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-6">
            {activeGenerations.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-4">
                {activeGenerations.map((gen) => {
                  const ratio = gen.format === '16:9' ? '16/9' : gen.format === '9:16' ? '9/16' : gen.format === '4:5' ? '4/5' : '1/1';
                  return (
                    <div
                      key={gen.id}
                      className="rounded-xl overflow-hidden bg-muted relative shrink-0"
                      style={{ aspectRatio: ratio, width: 220, maxHeight: 300 }}
                    >
                      <div className="absolute inset-0 animate-pulse bg-muted" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin opacity-40" />
                        <span className="text-xs opacity-40">Генерирую...</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {showEmptyState && !historyLoading && (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
                <ImageOff className="h-12 w-12 opacity-20" />
                <p className="text-sm">Нажми «Сгенерировать» чтобы создать первый креатив</p>
              </div>
            )}

            {historyLoading && historyItems.length === 0 && (
              <div style={{ columns: '220px', gap: '12px' }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="break-inside-avoid w-full mb-3" style={{ display: 'inline-block' }}>
                    <Skeleton className="w-full rounded-xl" style={{ aspectRatio: i % 3 === 0 ? '4/5' : i % 3 === 1 ? '1/1' : '16/9', animationDelay: `${i * 0.05}s` }} />
                  </div>
                ))}
              </div>
            )}

            {(!showEmptyState || activeGenerations.length > 0) && !(historyLoading && historyItems.length === 0) && (
              <JustifiedGallery
                items={historyItems}
                onItemClick={setPreviewItem}
                onDownload={handleDownloadUrl}
              />
            )}
          </div>
        </div>
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {chatMode && (
          <motion.div
            key="chat"
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="w-[320px] shrink-0 border-l border-border bg-card flex flex-col"
            style={{ height: '100%' }}
          >
            <div className="p-4 border-b flex items-center justify-between shrink-0" style={{ height: 'var(--panel-header-height)' }}>
              <div>
                <p className="font-medium text-sm">Доработка</p>
                <p className="text-xs text-muted-foreground mt-0.5">{activeChatItem?.headline || 'Последняя генерация'}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setChatMode(false); setActiveChatItem(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full p-4">
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
            </div>
            <div className="p-3 border-t border-border flex gap-2 shrink-0">
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
          </motion.div>
        )}
      </AnimatePresence>

    </section>

    {/* Preview dialog */}
    <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">Превью креатива</DialogTitle>
        {previewItem && (
          <div className="flex h-[80vh]">
            <div className="flex-1 bg-muted flex items-center justify-center p-6 min-w-0">
              <img src={previewItem.image_url} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
            <div className="w-[220px] shrink-0 border-l border-border flex flex-col">
              <div className="px-4 border-b border-border shrink-0 flex items-center" style={{ height: 'var(--panel-header-height)' }}>
                <p className="font-medium text-sm">Детали</p>
              </div>
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                <div className="flex flex-wrap gap-1.5">
                  {previewItem.format && <Badge variant="outline">{previewItem.format}</Badge>}
                  {previewItem.model_key && <Badge variant="secondary">{MODEL_LABELS[previewItem.model_key]}</Badge>}
                  {previewItem.image_size && <Badge variant="outline">{previewItem.image_size}</Badge>}
                </div>
                {previewItem.headline && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Заголовок</p>
                    <p className="text-sm font-medium">{previewItem.headline}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{formatDate(previewItem.created_at)}</p>
              </div>
              <div className="p-4 border-t border-border space-y-2">
                <Button className="w-full" size="sm" onClick={() => handleDownloadUrl(previewItem.image_url, previewItem.id)}>
                  <Download className="h-4 w-4 mr-2" />Скачать
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={() => {
                    setActiveChatItem(previewItem);
                    setChatMode(true);
                    setPreviewItem(null);
                    setHistory([{ role: 'user', parts: [{ text: `__imageUrl__:${previewItem.image_url}` }] }]);
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />Доработать
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

  </motion.div>
);
}
