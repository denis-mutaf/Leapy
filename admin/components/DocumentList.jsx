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
  ready: 'bg-green-100 text-green-700',
  processing: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Документы</h2>
        <button
          onClick={load}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          {loading ? 'Загрузка…' : '↻ Обновить'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading && docs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">Загрузка…</div>
        ) : docs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            Документы ещё не загружены
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Документ', 'Тип', 'Размер', 'Чанков', 'Статус', 'Загружен', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-medium text-gray-800 truncate">
                        {FILE_TYPE_ICON[doc.file_type] || '📎'}{' '}
                        {doc.title || doc.file_name}
                      </p>
                      {doc.title && (
                        <p className="text-xs text-gray-400 truncate">{doc.file_name}</p>
                      )}
                      {doc.status === 'failed' && doc.error && (
                        <p className="text-xs text-red-500 truncate mt-0.5">{doc.error}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 uppercase text-xs font-mono">
                      {doc.file_type}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatSize(doc.file_size)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-center font-medium">
                      {doc.chunk_count ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[doc.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[doc.status] || doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {confirmId === doc.id ? (
                        <span className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                          >
                            {deletingId === doc.id ? 'Удаление…' : 'Да, удалить'}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            Отмена
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmId(doc.id)}
                          disabled={!!deletingId}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
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
