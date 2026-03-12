'use client';

import { useCallback, useRef, useState } from 'react';
import { uploadDocument } from '@/lib/api';

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

export default function UploadForm({ onUploaded }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState(STATUS.idle);
  const [errorMsg, setErrorMsg] = useState('');
  const [successDoc, setSuccessDoc] = useState(null);
  const inputRef = useRef(null);

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
    setFile(f);
    setErrorMsg('');
    setStatus(STATUS.idle);
    setSuccessDoc(null);
  };

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
    setFile(null);
    setTitle('');
    setStatus(STATUS.idle);
    setErrorMsg('');
    setSuccessDoc(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Загрузка документа</h2>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">

        {/* Drag & Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-2
            border-2 border-dashed rounded-lg cursor-pointer
            px-6 py-10 transition-colors
            ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}
          `}
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
              <span className="text-2xl">📄</span>
              <p className="text-sm font-medium text-gray-700">{file.name}</p>
              <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="mt-1 text-xs text-red-500 hover:text-red-700 underline"
              >
                Убрать
              </button>
            </>
          ) : (
            <>
              <span className="text-3xl text-gray-300">⬆</span>
              <p className="text-sm text-gray-500">
                Перетащите файл или{' '}
                <span className="text-blue-600 font-medium">выберите с компьютера</span>
              </p>
              <p className="text-xs text-gray-400">
                {ACCEPTED_TYPES.join(', ')} · до {MAX_SIZE_MB} МБ
              </p>
            </>
          )}
        </div>

        {/* Title field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название документа{' '}
            <span className="text-gray-400 font-normal">(необязательно)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Прайс-лист 2025"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Error */}
        {errorMsg && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}

        {/* Success */}
        {status === STATUS.success && successDoc && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 space-y-0.5">
            <p className="font-medium">✓ Документ загружен успешно</p>
            <p className="text-green-600">
              {successDoc.title || successDoc.file_name} · {successDoc.chunk_count} чанков · статус: {successDoc.status}
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!file || status === STATUS.uploading}
          className="
            w-full py-2.5 px-4 text-sm font-medium rounded-lg
            bg-blue-600 text-white
            hover:bg-blue-700 active:bg-blue-800
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          {status === STATUS.uploading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Загрузка и обработка…
            </span>
          ) : 'Загрузить документ'}
        </button>
      </form>
    </section>
  );
}
