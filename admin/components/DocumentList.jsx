'use client';

import { useCallback, useEffect, useState } from 'react';
import { deleteDocument, getDocuments } from '@/lib/api';

/** @param {number} bytes */
function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

/** @param {string} iso */
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_STYLES = {
  ready: 'bg-[#ECFDF5] text-[#059669]',
  processing: 'bg-[#FFFBEB] text-[#D97706]',
  failed: 'bg-[#FEF2F2] text-[#DC2626]',
};

const STATUS_LABELS = {
  ready: 'Готов',
  processing: 'Обработка',
  failed: 'Ошибка',
};

const FILE_TYPE_ICON = {
  pdf: '📕',
  docx: '📘',
  txt: '📄',
  html: '🌐',
  md: '📝',
};

export default function DocumentList({ refreshKey }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDocuments();
      setDocs(data);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить список документов');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      await deleteDocument(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err.message || 'Ошибка при удалении документа');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-medium text-text">Документы</h2>
        <button
          onClick={load}
          disabled={loading}
          className="text-sm text-text opacity-70 hover:opacity-100 disabled:opacity-50 transition-default"
        >
          {loading ? 'Загрузка…' : '↻ Обновить'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-[#DC2626] bg-[#FEF2F2] rounded-input px-4 py-3 mb-6">
          {error}
        </p>
      )}

      <div className="bg-section rounded-card overflow-hidden">
        {loading && docs.length === 0 ? (
          <div className="px-8 py-14 text-center text-base text-text opacity-60">Загрузка…</div>
        ) : docs.length === 0 ? (
          <div className="px-8 py-14 text-center text-base text-text opacity-60">
            Документы ещё не загружены
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Документ', 'Тип', 'Размер', 'Чанков', 'Статус', 'Загружен', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-6 py-4 text-xs font-medium text-text opacity-60 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-border last:border-b-0 transition-default hover:bg-[linear-gradient(135deg,rgba(224,64,160,0.06),rgba(139,92,246,0.06))]"
                  >
                    <td className="px-6 py-4 max-w-xs">
                      <p className="font-medium text-text truncate">
                        {FILE_TYPE_ICON[doc.file_type] || '📎'}{' '}
                        {doc.title || doc.file_name}
                      </p>
                      {doc.title && (
                        <p className="text-xs text-text opacity-50 truncate">{doc.file_name}</p>
                      )}
                      {doc.status === 'failed' && doc.error && (
                        <p className="text-xs text-[#DC2626] truncate mt-0.5">{doc.error}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text opacity-60 uppercase text-xs font-mono">
                      {doc.file_type}
                    </td>
                    <td className="px-6 py-4 text-text opacity-60 whitespace-nowrap">
                      {formatSize(doc.file_size)}
                    </td>
                    <td className="px-6 py-4 text-text text-center font-medium">
                      {doc.chunk_count ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_STYLES[doc.status] || 'bg-[#F8F8F8] text-text opacity-70'}`}
                      >
                        {STATUS_LABELS[doc.status] || doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text opacity-50 whitespace-nowrap text-xs">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {confirmId === doc.id ? (
                        <span className="inline-flex items-center gap-3">
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            className="text-xs text-[#DC2626] hover:opacity-80 font-medium disabled:opacity-50 transition-default"
                          >
                            {deletingId === doc.id ? 'Удаление…' : 'Да, удалить'}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-xs text-text opacity-60 hover:opacity-100 transition-default"
                          >
                            Отмена
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmId(doc.id)}
                          disabled={!!deletingId}
                          className="text-xs text-text opacity-60 hover:text-[#DC2626] transition-default disabled:opacity-50 bg-transparent border-0"
                        >
                          Удалить
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
