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
      <h2 className="text-2xl font-medium text-text mb-8">Тест поиска</h2>

      <div className="space-y-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative rounded-input overflow-hidden focus-within:ring-2 focus-within:ring-offset-0 focus-within:ring-[#8B5CF6]/50 transition-default">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Введите поисковый запрос…"
              className="w-full px-5 py-4 text-base border border-border rounded-input bg-page text-text placeholder:opacity-50 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="
              px-6 py-4 text-base font-medium rounded-button
              btn-gradient text-white
              disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap
            "
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Поиск…
              </span>
            ) : 'Искать'}
          </button>
        </form>

        {error && (
          <p className="text-sm text-[#DC2626] bg-[#FEF2F2] rounded-input px-4 py-3">
            {error}
          </p>
        )}

        {results === null && !loading && (
          <p className="text-base text-text opacity-60 text-center py-10">
            Введите запрос для поиска по базе знаний
          </p>
        )}

        {results !== null && results.length === 0 && (
          <p className="text-base text-text opacity-70 text-center py-10">
            По запросу <span className="font-medium text-text">«{query}»</span> ничего не найдено
          </p>
        )}

        {results && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-text opacity-60">
              Найдено результатов: {results.length}
            </p>
            {results.map((r, i) => (
              <div
                key={r.chunk_id}
                className="bg-section rounded-card p-5 space-y-3 transition-default hover:bg-[#F0F0F0]"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <span className="text-xs text-text opacity-50 order-first w-full">
                    {r.document_title}
                  </span>
                  <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                    <span className="text-xs font-medium text-text opacity-50 shrink-0">#{i + 1}</span>
                    <SimilarityBadge value={r.similarity} />
                  </div>
                </div>
                <p className="text-base text-text leading-relaxed line-clamp-4">
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
  return (
    <span className="shrink-0 inline-block px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-gradient-leadleap">
      {pct}%
    </span>
  );
}
