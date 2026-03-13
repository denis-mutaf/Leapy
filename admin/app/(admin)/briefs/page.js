'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getBriefs } from '@/lib/api';
import { getQuestionLabel } from '@/lib/briefs-config';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildMarkdown(brief, slug) {
  const lines = [`# Бриф: ${slug}`, '', `Дата: ${formatDate(brief.created_at)}`, ''];
  const answers = brief.answers || {};
  for (const [id, val] of Object.entries(answers)) {
    const label = getQuestionLabel(slug, id);
    lines.push(`## ${label}`);
    lines.push(String(val || '').trim() || '—');
    lines.push('');
  }
  return lines.join('\n');
}

function downloadBriefAsMd(brief) {
  const slug = brief.slug || 'brief';
  const md = buildMarkdown(brief, slug);
  const dateStr = brief.created_at
    ? new Date(brief.created_at).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const filename = `brief-${slug}-${dateStr}.md`;
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BriefsListPage() {
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getBriefs()
      .then(setBriefs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-text opacity-70">Загрузка…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-text">Брифы</h1>
        <Link
          href="/"
          className="rounded-lg border border-border bg-page px-3 py-2 text-sm text-text transition hover:bg-section"
        >
          ← База знаний
        </Link>
      </div>
      {briefs.length === 0 ? (
        <p className="rounded-xl bg-section p-6 text-text opacity-70">Пока нет отправленных брифов.</p>
      ) : (
        <ul className="space-y-4">
          {briefs.map((b) => (
            <li key={b.id} className="rounded-xl border border-border bg-section p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-text">{b.slug}</span>
                <span className="text-sm text-text opacity-70">{formatDate(b.created_at)}</span>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadBriefAsMd(b)}
                  className="btn-gradient rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  Скачать .md
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
