'use client';

import { useMemo, useState } from 'react';
import { formatBRL } from '@/lib/format';
import type { Vale } from '@/lib/types';

interface Props {
  vales: Vale[];
  onOpen: (id: string) => void;
}

type Filter = 'all' | 'active' | 'used';

export function ValesList({ vales, onOpen }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    let list = vales;
    if (filter === 'active') list = list.filter((v) => v.saldo > 0);
    else if (filter === 'used') list = list.filter((v) => v.saldo === 0);
    const q = query.toLowerCase().trim();
    if (!q) return list;
    const qDigits = q.replace(/\D/g, '');
    return list.filter(
      (v) =>
        v.id.toLowerCase().includes(q) ||
        v.nome.toLowerCase().includes(q) ||
        (qDigits && v.cpf.replace(/\D/g, '').includes(qDigits)),
    );
  }, [vales, query, filter]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 flex-1 min-w-[280px] bg-paper rounded-md border-2 border-line focus-within:border-lulu-magenta focus-within:ring-4 focus-within:ring-lulu-magenta/15 px-4 transition shadow-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-mute">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered.length >= 1) {
                onOpen(filtered[0].id);
                setQuery('');
              }
            }}
            placeholder="Código de barras, nome ou CPF…"
            className="flex-1 py-3 bg-transparent text-base focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {(
            [
              ['all', 'Todos'],
              ['active', 'Ativos'],
              ['used', 'Esgotados'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition ${
                filter === k
                  ? 'bg-ink text-white border-ink'
                  : 'bg-paper text-ink-soft border-line hover:border-ink-mute'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-soft">
          {vales.length === 0 ? (
            <>
              <div className="font-display text-3xl text-lulu-purple mb-2">
                Nenhum vale ainda 🩷
              </div>
              <p className="text-sm">Os vales aparecerão aqui após a primeira venda.</p>
            </>
          ) : (
            <>
              <div className="font-display text-3xl text-lulu-purple mb-2">
                Nada encontrado
              </div>
              <p className="text-sm">Tenta outro termo ou muda o filtro acima.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <ValeCard key={v.id} vale={v} onOpen={onOpen} />
          ))}
        </div>
      )}
    </>
  );
}

function ValeCard({ vale, onOpen }: { vale: Vale; onOpen: (id: string) => void }) {
  const used = vale.valorOriginal - vale.saldo;
  const pct = vale.valorOriginal > 0 ? (used / vale.valorOriginal) * 100 : 0;
  const isUsed = vale.saldo === 0;

  return (
    <button
      onClick={() => onOpen(vale.id)}
      className="text-left bg-paper rounded-md p-5 border-2 border-line shadow-sm hover:-translate-y-0.5 hover:border-lulu-purple-soft hover:shadow-md transition"
    >
      <div className="font-mono text-xs text-ink-mute tracking-wide font-semibold">
        {vale.id}
      </div>
      <div className="font-bold text-base mt-1 text-ink leading-tight">
        {vale.nome}
      </div>
      <div className="text-sm text-ink-soft mt-0.5">{vale.cpf}</div>
      <div className="flex items-baseline justify-between mt-3">
        <div
          className={`font-display text-2xl font-bold ${
            isUsed ? 'text-ink-mute line-through' : 'text-lulu-magenta'
          }`}
        >
          {formatBRL(vale.saldo)}
        </div>
        <div className="text-xs text-ink-soft">de {formatBRL(vale.valorOriginal)}</div>
      </div>
      <div className="h-1.5 bg-line rounded-full mt-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isUsed ? 'bg-lulu-cyan' : 'bg-lulu-magenta'
          }`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </button>
  );
}
