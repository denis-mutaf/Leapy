'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadDocument, generateTitle } from '@/lib/api';

const ACCEPTED_TYPES = ['.pdf', '.docx', '.txt', '.html', '.md'];
const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/html',
  'text/markdown',
];
const MAX_SIZE_MB = 20;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/** @param {number} bytes */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

const STATUS = { idle: 'idle', uploading: 'uploading', success: 'success', error: 'error' };

/** Иконка загрузки в градиентных цветах */
function UploadIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden>
      <defs>
        <linearGradient id="upload-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E040A0" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <path
        d="M12 16V4m0 0l4 4m-4-4l-4 4"
        stroke="url(#upload-icon-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
        stroke="url(#upload-icon-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function UploadForm({ onUploaded }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [titleGenerating, setTitleGenerating] = useState(false);
  const [status, setStatus] = useState(STATUS.idle);
  const [errorMsg, setErrorMsg] = useState('');
  const [successDoc, setSuccessDoc] = useState(null);
  const inputRef = useRef(null);
  const titleAbortRef = useRef(false);

  const validateFile = (f) => {
    if (!f) return 'Файл не выбран';
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext)) {
      return `Неподдерживаемый формат. Допустимые: ${ACCEPTED_TYPES.join(', ')}`;
    }
    if (f.size > MAX_SIZE_BYTES) {
      return `Файл слишком большой. Максимум: ${MAX_SIZE_MB} МБ`;
    }
    return null;
  };

  const handleFileSelect = (f) => {
    const err = validateFile(f);
    if (err) {
      setErrorMsg(err);
      setFile(null);
      return;
    }
    titleAbortRef.current = true; // отменить предыдущую генерацию, если была
    setFile(f);
    setTitle('');
    setErrorMsg('');
    setStatus(STATUS.idle);
    setSuccessDoc(null);
  };

  // Автогенерация названия при выборе файла
  useEffect(() => {
    if (!file) {
      setTitleGenerating(false);
      return;
    }
    titleAbortRef.current = false;
    setTitleGenerating(true);

    generateTitle(file)
      .then((data) => {
        if (titleAbortRef.current) return;
        setTitle(data.title || '');
      })
      .catch(() => {
        if (titleAbortRef.current) return;
        // Оставляем поле пустым при ошибке, не показываем ошибку пользователю
      })
      .finally(() => {
        if (!titleAbortRef.current) setTitleGenerating(false);
      });
  }, [file]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  }, []);

  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);

  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      onUploaded?.();
    } catch (err) {
      setStatus(STATUS.error);
      setErrorMsg(err.message || 'Неизвестная ошибка при загрузке');
    }
  };

  const reset = () => {
    titleAbortRef.current = true;
    setFile(null);
    setTitle('');
    setTitleGenerating(false);
    setStatus(STATUS.idle);
    setErrorMsg('');
    setSuccessDoc(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <section>
      <h2 className="text-2xl font-medium text-text mb-8">Загрузка документа</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drag & Drop: label-обёртка открывает диалог нативно */}
        <label
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`
            relative flex flex-col items-center justify-center gap-4 rounded-card cursor-pointer
            min-h-[200px] px-8 py-10 transition-default bg-section
            border-2 border-dashed
            ${dragOver ? 'border-[#8B5CF6]' : 'border-[#C850C0]'}
          `}
          style={
            dragOver
              ? { background: 'linear-gradient(135deg, rgba(224,64,160,0.08), rgba(139,92,246,0.08))' }
              : undefined
          }
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            onChange={onInputChange}
          />

          {file ? (
            <>
              <span className="text-3xl">📄</span>
              <p className="text-base font-medium text-text">{file.name}</p>
              <p className="text-sm text-text opacity-60">{formatSize(file.size)}</p>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); reset(); }}
                className="mt-1 text-sm text-[#DC2626] hover:opacity-80 transition-default underline"
              >
                Убрать
              </button>
            </>
          ) : (
            <>
              <UploadIcon />
              <p className="text-base text-text opacity-80 text-center">
                Перетащите файл или{' '}
                <span className="font-medium text-text underline decoration-border hover:opacity-100">
                  выберите с компьютера
                </span>
              </p>
              <p className="text-sm text-text opacity-60">
                {ACCEPTED_TYPES.join(', ')} · до {MAX_SIZE_MB} МБ
              </p>
            </>
          )}
        </label>

        {/* Название документа */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Название документа{' '}
            <span className="font-normal opacity-60">(необязательно)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={titleGenerating ? 'Генерация названия…' : 'Например: Прайс-лист 2025'}
            disabled={titleGenerating}
            className="w-full px-4 py-3 text-base border border-border rounded-input bg-page text-text placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[#8B5CF6]/50 transition-default disabled:opacity-80"
          />
          {titleGenerating && (
            <p className="mt-2 flex items-center gap-2 text-sm text-text opacity-60" role="status" aria-live="polite">
              <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Генерация названия…
            </p>
          )}
        </div>

        {errorMsg && (
          <p className="text-sm text-[#DC2626] bg-[#FEF2F2] rounded-input px-4 py-3">
            {errorMsg}
          </p>
        )}

        {status === STATUS.success && successDoc && (
          <div className="text-sm rounded-input px-4 py-3 space-y-0.5 bg-[#ECFDF5] text-[#059669]">
            <p className="font-medium">✓ Документ загружен успешно</p>
            <p className="opacity-90">
              {successDoc.title || successDoc.file_name} · {successDoc.chunk_count} чанков · статус: {successDoc.status}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || status === STATUS.uploading}
          className="
            w-full py-3 px-5 text-base font-medium rounded-button
            btn-gradient text-white
            disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:filter-none
          "
        >
          {status === STATUS.uploading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Загрузка и обработка…
            </span>
          ) : 'Загрузить'}
        </button>
      </form>
    </section>
  );
}
