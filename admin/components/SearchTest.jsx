'use client';

import { useState } from 'react';
import { searchDocuments } from '@/lib/api';

export default function SearchTest() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const data = await searchDocuments(query.trim());
      setResults(data);
    } catch (err) {
      setError(err.message || 'Ошибка при выполнении поиска');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pb-10">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Тест поиска</h2>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите поисковый запрос…"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="
              px-5 py-2 text-sm font-medium rounded-lg
              bg-blue-600 text-white
              hover:bg-blue-700 active:bg-blue-800
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors whitespace-nowrap
            "
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Поиск…
              </span>
            ) : 'Искать'}
          </button>
        </form>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {results === null && !loading && (
          <p className="text-sm text-gray-400 text-center py-6">
            Введите запрос для поиска по базе знаний
          </p>
        )}

        {results !== null && results.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">
            По запросу <span className="font-medium">«{query}»</span> ничего не найдено
          </p>
        )}

        {results && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              Найдено результатов: {results.length}
            </p>
            {results.map((r, i) => (
              <div
                key={r.chunk_id}
                className="border border-gray-200 rounded-lg p-4 space-y-2 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-gray-400 shrink-0">#{i + 1}</span>
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {r.document_title}
                    </span>
                  </div>
                  <SimilarityBadge value={r.similarity} />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                  {r.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** @param {{ value: number }} props */
function SimilarityBadge({ value }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80 ? 'bg-green-100 text-green-700' :
    pct >= 60 ? 'bg-blue-100 text-blue-700' :
    pct >= 40 ? 'bg-yellow-100 text-yellow-700' :
    'bg-gray-100 text-gray-500';

  return (
    <span className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {pct}%
    </span>
  );
}
