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
import { Sparkles, Loader2, Download, RefreshCw, MessageSquare, SendHorizontal, X, ImageOff, ImageIcon, Settings2 } from 'lucide-react';
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

function PhotoUploadZone({ compositionFiles, onCompositionChange, referenceFiles, onReferenceChange }) {
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [loadingUrls, setLoadingUrls] = useState(new Set());

  useEffect(() => {
    const handlePaste = (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find(item => item.type.startsWith('image/'));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (file) {
        const named = new File([file], `paste-${Date.now()}.png`, { type: file.type });
        onCompositionChange(prev => [...prev, named].slice(0, 3));
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [onCompositionChange]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) onCompositionChange(prev => [...prev, ...files].slice(0, 3));
  };

  const allThumbs = compositionFiles.map(f => ({ file: f, type: 'composition' }));

  const removeThumb = (thumbIndex) => {
    onCompositionChange(prev => prev.filter((_, i) => i !== thumbIndex));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Фото товара</label>
        {referenceFiles.length > 0 && (
          <span className="text-[10px] text-muted-foreground">{referenceFiles.length} реф.</span>
        )}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed cursor-pointer transition-colors duration-150',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-foreground/30 hover:bg-accent/30'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
            onCompositionChange(prev => [...prev, ...files].slice(0, 3));
            e.target.value = '';
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground/70">Вставить из буфера</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Нажмите <kbd className="px-1 py-0.5 rounded text-[9px] bg-muted border border-border font-mono">⌘V</kbd> или перетащите файл
          </p>
        </div>
        <div className="shrink-0 h-7 w-7 rounded-md bg-muted flex items-center justify-center">
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      {allThumbs.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {allThumbs.map(({ file }, i) => {
            const url = URL.createObjectURL(file);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15 }}
                className="relative group w-14 h-14 rounded-lg overflow-hidden border border-border bg-muted shrink-0"
              >
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                  onLoad={() => URL.revokeObjectURL(url)}
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeThumb(i); }}
                  className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </motion.div>
            );
          })}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const inp = document.createElement('input');
              inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
              inp.onchange = (ev) => {
                const files = Array.from(ev.target.files || []);
                onReferenceChange(prev => [...prev, ...files].slice(0, 5));
              };
              inp.click();
            }}
            className="w-14 h-14 rounded-lg border border-dashed border-border bg-muted/50 flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <span className="text-lg leading-none">+</span>
            <span className="text-[8px]">ещё</span>
          </button>
        </div>
      )}
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

function BenefitsList({ benefits, onChange }) {
  const add = () => { if (benefits.length < 4) onChange([...benefits, '']); };
  const remove = (i) => onChange(benefits.filter((_, idx) => idx !== i));
  const update = (i, val) => onChange(benefits.map((b, idx) => idx === i ? val : b));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Преимущества</label>
        {benefits.length < 4 && (
          <button
            type="button"
            onClick={add}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            + Добавить
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {benefits.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="flex gap-1.5 items-center"
            >
              <Input
                value={b}
                onChange={(e) => update(i, e.target.value)}
                placeholder={
                  i === 0 ? 'Бесплатная доставка до 3 дней' :
                  i === 1 ? 'Гарантия 14 дней' :
                  i === 2 ? 'Оплата при получении' :
                  'Официальная гарантия'
                }
                className="flex-1 text-sm h-9"
              />
              {benefits.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

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
  const [benefits, setBenefits] = useState(['']);
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [price, setPrice] = useState('');
  const parseDebounceRef = useRef(null);

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
      if (Array.isArray(saved.benefits)) setBenefits(saved.benefits.length ? saved.benefits : ['']);
      if (saved.price != null) setPrice(saved.price);
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
        benefits,
        price,
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
    benefits,
    price,
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

  const handleParseProduct = useCallback(async (urlOverride) => {
    const url = urlOverride ?? productUrl;
    if (!url?.trim() || !API_URL) return;
    setCompositionFiles([]);
    setImageUrl('');
    setParsing(true);
    setParseError('');
    try {
      const res = await fetch(`${API_URL}/creatives/parse-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          settings: {
            style,
            language,
            goals,
            targetAudience,
            industry,
            format,
          },
        }),
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
      if (data.price) setPrice(data.price);
      if (data.language) setLanguage(data.language);
      if (data.visual_prompt) setUserPrompt(data.visual_prompt);
      if (Array.isArray(data.benefits) && data.benefits.length > 0) {
        setBenefits(data.benefits.slice(0, 4));
      }
      if (data.image_url && data.image_url !== 'null') {
        setImageUrl(data.image_url);
        handleFetchImageUrl(data.image_url);
      }
    } catch (e) {
      setParseError('Ошибка сети. Проверь подключение.');
    } finally {
      setParsing(false);
    }
  }, [productUrl, API_URL, handleFetchImageUrl, style, language, goals, targetAudience, industry, format]);

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
    form.append('price', price);
    form.append('benefits', JSON.stringify(benefits.filter(b => b.trim())));
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
    price,
    benefits,
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
      <div className="px-4 border-b border-border shrink-0 flex items-center justify-between" style={{ height: 'var(--panel-header-height)' }}>
        <h2 className="text-base font-semibold">Генератор</h2>
        <button
          type="button"
          onClick={() => setSettingsOpen(v => !v)}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-4">

          {/* 1. URL autofill */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Ссылка на товар</label>
            <div className="relative">
              <div
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{
                  padding: '1.5px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)',
                  borderRadius: '10px',
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />
              <Input
                value={productUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setProductUrl(val);
                  if (parseDebounceRef.current) clearTimeout(parseDebounceRef.current);
                  if (val.trim().startsWith('http')) {
                    parseDebounceRef.current = setTimeout(() => {
                      handleParseProduct(val);
                    }, 800);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && productUrl.trim()) {
                    if (parseDebounceRef.current) clearTimeout(parseDebounceRef.current);
                    handleParseProduct(productUrl);
                  }
                }}
                placeholder="https://topmag.md/product/..."
                className="relative text-sm border-transparent bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={parsing}
              />
              {parsing && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {parseError && (
              <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-3">
                <span className="flex-1">{parseError}</span>
                <button type="button" onClick={() => setParseError('')} className="shrink-0">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Цена</label>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="1 299 lei"
              className="text-sm"
            />
          </div>

          {/* 2. Photo upload */}
          <PhotoUploadZone
            compositionFiles={compositionFiles}
            onCompositionChange={setCompositionFiles}
            referenceFiles={referenceFiles}
            onReferenceChange={setReferenceFiles}
          />

          {/* 3. Format */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Формат</label>
            <div className="flex gap-1.5">
              {FORMATS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormat(f.value)}
                  className={cn(
                    'flex-1 flex flex-col items-center justify-center gap-0.5 h-11 rounded-lg border text-center transition-colors duration-150',
                    format === f.value ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-foreground border-border hover:border-foreground/40'
                  )}
                >
                  <span className="text-xs font-medium">{f.value}</span>
                  <span className="text-[10px] opacity-50">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Texts */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Тексты</label>
            <div className="space-y-1.5">
              <AutoResizeTextarea value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Заголовок" />
              <AutoResizeTextarea value={subheadline} onChange={(e) => setSubheadline(e.target.value)} placeholder="Подзаголовок" />
              <div className="flex gap-1.5">
                <AutoResizeTextarea value={cta} onChange={(e) => setCta(e.target.value)} placeholder="CTA" className="flex-1" />
                <AutoResizeTextarea value={extraText} onChange={(e) => setExtraText(e.target.value)} placeholder="Бейдж / плашка" className="flex-1" />
              </div>
            </div>
          </div>

          <BenefitsList benefits={benefits} onChange={setBenefits} />

          {/* 5. Prompt */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Промпт</label>
            <Textarea
              rows={3}
              className="resize-none text-sm"
              placeholder="Дополнительные инструкции для модели..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
            />
          </div>

          {/* 6. Generate button */}
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

          {/* 7. Error block */}
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
    <section className="flex-1 flex min-h-0 overflow-hidden relative">

      {/* Settings overlay */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-10"
              onClick={() => setSettingsOpen(false)}
            />
            <motion.div
              key="settings-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="absolute right-0 top-0 bottom-0 z-20 w-[280px] bg-card border-l border-border flex flex-col shadow-xl"
            >
              <div className="px-4 border-b border-border shrink-0 flex items-center justify-between" style={{ height: 'var(--panel-header-height)' }}>
                <h3 className="text-sm font-semibold">Настройки</h3>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <ScrollArea className="flex-1">
                <div className="px-4 py-4 space-y-5">

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Лого</label>
                    {logoFiles.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          const inp = document.createElement('input');
                          inp.type = 'file';
                          inp.accept = 'image/*';
                          inp.onchange = (e) => {
                            const f = e.target.files?.[0];
                            if (f) setLogoFiles([f]);
                          };
                          inp.click();
                        }}
                        className="w-full h-9 rounded-lg border border-dashed border-border bg-muted/50 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        Загрузить лого
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-border bg-muted shrink-0 group">
                          <img
                            src={URL.createObjectURL(logoFiles[0])}
                            alt="logo"
                            className="w-full h-full object-contain p-1"
                          />
                          <button
                            type="button"
                            onClick={() => setLogoFiles([])}
                            className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                        <span className="text-xs text-muted-foreground truncate">{logoFiles[0].name}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Модель</label>
                    <div className="flex gap-1.5">
                      {MODELS.map(m => (
                        <button key={m.key} type="button" onClick={() => setSelectedModel(m.key)}
                          className={cn('flex-1 flex flex-col items-center justify-center gap-0.5 h-11 rounded-lg border text-center transition-colors duration-150',
                            selectedModel === m.key ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-foreground border-border hover:border-foreground/40'
                          )}>
                          <span className="text-xs font-medium">{m.label}</span>
                          <span className="text-[10px] opacity-50">{m.tag}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Разрешение</label>
                    <div className="flex gap-1.5">
                      {RESOLUTIONS.map(r => (
                        <button key={r.key} type="button" onClick={() => setImageSize(r.key)}
                          className={cn('flex-1 flex flex-col items-center justify-center gap-0.5 h-11 rounded-lg border text-center transition-colors duration-150',
                            imageSize === r.key ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-foreground border-border hover:border-foreground/40'
                          )}>
                          <span className="text-xs font-medium">{r.label}</span>
                          <span className="text-[10px] opacity-50">{r.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Стиль</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {STYLES.map(s => (
                        <button key={s.key} type="button" onClick={() => setStyle(s.key)}
                          className={cn('flex flex-col items-center justify-center gap-0.5 h-10 rounded-lg border text-center transition-colors duration-150',
                            style === s.key ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-foreground border-border hover:border-foreground/40'
                          )}>
                          <span className="text-xs font-medium">{s.label}</span>
                          <span className="text-[10px] opacity-50">{s.tag}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Цель</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {GOALS.map(g => (
                        <button key={g.value} type="button"
                          onClick={() => setGoals(prev => prev.includes(g.value) ? prev.filter(v => v !== g.value) : [...prev, g.value])}
                          className={cn('flex flex-col items-center justify-center gap-0.5 h-10 rounded-lg border text-center transition-colors duration-150',
                            goals.includes(g.value) ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-foreground border-border hover:border-foreground/40'
                          )}>
                          <span className="text-xs font-medium">{g.label}</span>
                          <span className="text-[10px] opacity-50">{g.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Язык</label>
                    <div className="flex gap-1.5">
                      {LANGUAGES.map(l => (
                        <button key={l.key} type="button" onClick={() => setLanguage(l.key)}
                          className={cn('flex-1 h-9 rounded-lg border text-xs font-medium transition-colors duration-150',
                            language === l.key ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-foreground border-border hover:border-foreground/40'
                          )}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Отрасль</label>
                    <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Онлайн-магазин, ресторан..." className="text-sm" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Целевая аудитория</label>
                    <Input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="18–35, покупатели..." className="text-sm" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Цвета</label>
                    <div className="space-y-2">
                      <ColorRow value={colorBackground} onChange={setColorBackground} label="Фон" />
                      <ColorRow value={colorAccent} onChange={setColorAccent} label="Акцент / CTA" />
                      <ColorRow value={colorText} onChange={setColorText} label="Текст" />
                      <ColorRow value={colorSecondary} onChange={setColorSecondary} label="Доп." />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Шрифты</label>
                    <Input value={fonts} onChange={(e) => setFonts(e.target.value)} placeholder="Inter, Montserrat..." className="text-sm" />
                  </div>

                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
