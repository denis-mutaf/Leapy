'use client';

import { useState } from 'react';
import { askQuestion } from '@/lib/api';

/** Иконка AI-спаркла в градиентных цветах */
function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id="sparkle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E040A0" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <path
        d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"
        fill="url(#sparkle-grad)"
      />
    </svg>
  );
}

export default function AskAI() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await askQuestion(question.trim());
      setResult(data);
    } catch (err) {
      setError(err.message || 'Ошибка при обращении к AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pb-10">
      <div className="flex items-center gap-2 mb-8">
        <h2 className="text-2xl font-medium text-text">Спросить AI</h2>
        <SparkleIcon />
      </div>

      <div className="space-y-6">
        <form onSubmit={handleAsk} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 focus-within:ring-2 focus-within:ring-offset-0 focus-within:ring-[#8B5CF6]/50 rounded-input transition-default">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Например: Какая рассрочка на Select New Town?"
              className="w-full px-5 py-4 text-base border border-border rounded-input bg-page text-text placeholder:opacity-50 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !question.trim()}
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
                Думаю…
              </span>
            ) : 'Спросить'}
          </button>
        </form>

        {error && (
          <p className="text-sm text-[#DC2626] bg-[#FEF2F2] rounded-input px-4 py-3">
            {error}
          </p>
        )}

        {result === null && !loading && (
          <p className="text-base text-text opacity-60 text-center py-10">
            Задайте вопрос — AI найдёт ответ в базе знаний
          </p>
        )}

        {result !== null && (
          <div className="space-y-5">
            {/* Ответ Claude */}
            <div
              className="rounded-card p-6 space-y-3"
              style={{
                background: 'linear-gradient(135deg, rgba(224,64,160,0.06), rgba(139,92,246,0.06))',
                border: '1px solid rgba(139,92,246,0.15)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <SparkleIcon />
                <span className="text-sm font-medium text-text opacity-70">Ответ AI</span>
              </div>
              <p className="text-base text-text leading-relaxed whitespace-pre-wrap">
                {result.answer}
              </p>
            </div>

            {/* Источники */}
            {result.sources && result.sources.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-text opacity-60">
                  Источники ({result.sources.length})
                </p>
                {result.sources.map((s, i) => (
                  <div
                    key={i}
                    className="bg-section rounded-card p-4 flex flex-col sm:flex-row sm:items-start gap-3 transition-default hover:bg-[#F0F0F0]"
                  >
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">
                        {s.document_title}
                      </p>
                      <p className="text-sm text-text opacity-60 line-clamp-2 leading-relaxed">
                        {s.content_preview}
                        {s.content_preview?.length >= 200 ? '…' : ''}
                      </p>
                    </div>
                    <SimilarityBadge value={s.similarity} />
                  </div>
                ))}
              </div>
            )}
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
    <span
      className="shrink-0 self-start inline-block px-2.5 py-1 rounded-lg text-xs font-semibold text-white"
      style={{ background: 'linear-gradient(135deg, #E040A0, #C850C0, #8B5CF6, #6366F1)' }}
    >
      {pct}%
    </span>
  );
}
