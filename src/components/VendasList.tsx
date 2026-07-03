'use client';

import { useMemo, useState } from 'react';
import { formatBRL, formatDate } from '@/lib/format';
import type { Venda } from '@/lib/types';

export type VendasFilter = 'aguardando' | 'retiradas' | 'canceladas' | 'todas';

interface Props {
  vendas: Venda[];
  filter: VendasFilter;
  onFilterChange: (f: VendasFilter) => void;
  onRetirar: (id: number) => void;
  onCancelar: (id: number) => void;
  onReimprimir: (venda: Venda) => void;
  onAvisar: (venda: Venda) => void;
}

function short(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Dias restantes até o prazo (negativo = vencido). */
function diasRestantes(prazoIso: string): number {
  const ms = new Date(prazoIso).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function VendasList({
  vendas,
  filter,
  onFilterChange,
  onRetirar,
  onCancelar,
  onReimprimir,
  onAvisar,
}: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let list = vendas;
    if (filter === 'aguardando') list = list.filter((v) => v.status === 'aguardando');
    else if (filter === 'retiradas') list = list.filter((v) => v.status === 'retirada');
    else if (filter === 'canceladas') list = list.filter((v) => v.status === 'cancelada');

    const q = query.toLowerCase().trim();
    if (q) {
      const qDigits = q.replace(/\D/g, '');
      list = list.filter(
        (v) =>
          v.nome.toLowerCase().includes(q) ||
          (v.instagram && v.instagram.toLowerCase().includes(q.replace(/^@/, ''))) ||
          String(v.codigo).includes(qDigits) ||
          (qDigits && v.whatsapp && v.whatsapp.replace(/\D/g, '').includes(qDigits)),
      );
    }
    return list;
  }, [vendas, filter, query]);

  const contagem = useMemo(
    () => ({
      aguardando: vendas.filter((v) => v.status === 'aguardando').length,
      retiradas: vendas.filter((v) => v.status === 'retirada').length,
      canceladas: vendas.filter((v) => v.status === 'cancelada').length,
      todas: vendas.length,
    }),
    [vendas],
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 flex-1 min-w-[280px] bg-paper rounded-md border-2 border-line focus-within:border-lulu-magenta focus-within:ring-4 focus-within:ring-lulu-magenta/15 px-4 transition shadow-sm">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ink-mute"
          >
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Código, nome, Instagram ou WhatsApp…"
            className="flex-1 py-3 bg-transparent text-base focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {(
          [
            ['aguardando', `Aguardando (${contagem.aguardando})`],
            ['retiradas', `Retiradas (${contagem.retiradas})`],
            ['canceladas', `Canceladas (${contagem.canceladas})`],
            ['todas', `Todas (${contagem.todas})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => onFilterChange(k)}
            className={`px-4 py-2 rounded-full text-xs font-bold border-2 transition ${
              filter === k
                ? 'bg-lulu-purple text-white border-lulu-purple'
                : 'bg-paper text-ink-soft border-line hover:border-ink-mute'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-soft py-8 text-center">Nenhum pedido nesse filtro.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {filtered.map((v) => {
            const dias = diasRestantes(v.prazoRetirada);
            const vencido = v.status === 'aguardando' && dias < 0;
            const urgente = v.status === 'aguardando' && dias >= 0 && dias <= 2;
            return (
              <li key={v.id} className="lulu-card p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-lulu-purple">
                        #{String(v.codigo).padStart(4, '0')}
                      </span>
                      <StatusBadge status={v.status} />
                    </div>
                    <div className="font-bold text-ink truncate mt-1">{v.nome}</div>
                    <div className="text-xs text-ink-soft mt-0.5 flex items-center gap-2 flex-wrap">
                      {v.instagram && <span>@{v.instagram}</span>}
                      {v.whatsapp && (
                        <>
                          {v.instagram && <span className="text-ink-mute">·</span>}
                          <span>{v.whatsapp}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="font-display font-bold text-lg text-lulu-magenta">
                      {formatBRL(v.valor)}
                    </div>
                    <div className="text-[10px] text-ink-mute">{formatDate(v.criadoEm)}</div>
                  </div>
                </div>

                {v.status === 'aguardando' && (
                  <div
                    className={`text-xs font-bold rounded-md px-2.5 py-1.5 ${
                      vencido
                        ? 'bg-lulu-heart-red/10 text-lulu-heart-red'
                        : urgente
                          ? 'bg-lulu-yellow/20 text-ink'
                          : 'bg-lulu-cyan-soft text-lulu-cyan'
                    }`}
                  >
                    {vencido
                      ? `⚠ Prazo vencido há ${Math.abs(dias)} dia(s) — retirar até ${short(v.prazoRetirada)}`
                      : `⏳ Retirar até ${short(v.prazoRetirada)} (${dias} dia(s))`}
                  </div>
                )}
                {v.status === 'retirada' && v.retiradaEm && (
                  <div className="text-xs text-ink-soft">✓ Retirado em {short(v.retiradaEm)}</div>
                )}

                <div className="flex gap-2 flex-wrap mt-auto">
                  {v.status === 'aguardando' && (
                    <button
                      onClick={() => onRetirar(v.id)}
                      className="lulu-btn-primary text-sm py-2 px-3 flex-1"
                    >
                      Marcar retirada
                    </button>
                  )}
                  {v.status === 'aguardando' && (
                    <button
                      onClick={() => onAvisar(v)}
                      className="text-sm py-2 px-3 rounded-full border-2 border-lulu-mint bg-lulu-mint/20 text-ink font-bold hover:bg-lulu-mint/40 transition"
                    >
                      Avisar retirada
                    </button>
                  )}
                  <button
                    onClick={() => onReimprimir(v)}
                    className="lulu-btn-secondary text-sm py-2 px-3"
                  >
                    Reimprimir
                  </button>
                  {v.status !== 'cancelada' && (
                    <button
                      onClick={() => onCancelar(v.id)}
                      className="text-sm py-2 px-3 rounded-full border-2 border-line text-ink-soft hover:border-lulu-heart-red hover:text-lulu-heart-red font-bold transition"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: Venda['status'] }) {
  const map = {
    aguardando: ['Aguardando', 'bg-lulu-cyan-soft text-lulu-cyan'],
    retirada: ['Retirada', 'bg-lulu-mint/20 text-ink'],
    cancelada: ['Cancelada', 'bg-ink/10 text-ink-soft line-through'],
  } as const;
  const [label, cls] = map[status];
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}
