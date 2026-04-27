'use client';

import { useMemo, useState } from 'react';
import { formatBRL, formatCPF } from '@/lib/format';
import type { Vale } from '@/lib/types';

interface Props {
  vales: Vale[];
  onOpen: (id: string) => void;
  onPrintLote?: (vales: Vale[]) => void;
}

type Filter = 'all' | 'active' | 'used' | 'deleted';
type Periodo = 'todos' | '7d' | '30d' | 'mes';
type Sort = 'recente' | 'antigo' | 'saldo' | 'valor';

interface ListProps extends Props {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
}

function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const ESGOTANDO_LIMITE = 10; // saldo < R$ 10

export function ValesList({ vales, onOpen, onPrintLote, filter, onFilterChange }: ListProps) {
  const [query, setQuery] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('todos');
  const [sort, setSort] = useState<Sort>('recente');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = vales;
    // Status filter
    if (filter === 'deleted') {
      list = list.filter((v) => v.deletadoEm);
    } else {
      list = list.filter((v) => !v.deletadoEm);
      if (filter === 'active') list = list.filter((v) => v.saldo > 0);
      else if (filter === 'used') list = list.filter((v) => v.saldo === 0);
    }
    // Período
    if (periodo !== 'todos') {
      const now = new Date();
      let cutoff = 0;
      if (periodo === '7d') cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      else if (periodo === '30d') cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      else if (periodo === 'mes') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        cutoff = start.getTime();
      }
      list = list.filter((v) => new Date(v.criadoEm).getTime() >= cutoff);
    }
    // Texto/valor
    const q = query.toLowerCase().trim();
    if (q) {
      const qDigits = q.replace(/\D/g, '');
      const cleanedNumber = q
        .replace(/r\$\s*/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      const numMatch = /^\d+(\.\d{1,2})?$/.test(cleanedNumber)
        ? parseFloat(cleanedNumber)
        : null;
      list = list.filter(
        (v) =>
          v.id.toLowerCase().includes(q) ||
          v.nome.toLowerCase().includes(q) ||
          (qDigits && v.cpf.replace(/\D/g, '').includes(qDigits)) ||
          (numMatch !== null &&
            (v.valorOriginal === numMatch || v.saldo === numMatch)),
      );
    }
    // Ordenação
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'antigo':
          return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
        case 'saldo':
          return b.saldo - a.saldo;
        case 'valor':
          return b.valorOriginal - a.valorOriginal;
        case 'recente':
        default:
          return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
      }
    });
    return sorted;
  }, [vales, query, filter, periodo, sort]);

  const totals = useMemo(() => {
    const valor = filtered.reduce((s, v) => s + v.valorOriginal, 0);
    const saldo = filtered.reduce((s, v) => s + v.saldo, 0);
    return { valor, saldo, qtd: filtered.length };
  }, [filtered]);

  function toggleSelecionado(id: string) {
    setSelecionados((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selecionados.size === filtered.length && filtered.length > 0) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(filtered.map((v) => v.id)));
    }
  }

  function imprimirLoteAcao() {
    if (!onPrintLote) return;
    const list = vales.filter((v) => selecionados.has(v.id));
    if (list.length === 0) return;
    onPrintLote(list);
    setSelecionados(new Set());
  }

  const modoSelecao = selecionados.size > 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
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
            placeholder="Código, nome, CPF ou valor (ex: 150)…"
            className="flex-1 py-3 bg-transparent text-base focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['all', 'Todos'],
              ['active', 'Ativos'],
              ['used', 'Esgotados'],
              ['deleted', 'Excluídos'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => onFilterChange(k)}
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

      {/* Filtro de período + ordenação */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          Período:
        </span>
        {(
          [
            ['todos', 'Todos'],
            ['7d', '7 dias'],
            ['30d', '30 dias'],
            ['mes', 'Este mês'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setPeriodo(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${
              periodo === k
                ? 'bg-lulu-purple text-white border-lulu-purple'
                : 'bg-paper text-ink-soft border-line hover:border-ink-mute'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Ordenar:
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-line bg-paper text-ink hover:border-ink-mute transition"
          >
            <option value="recente">Mais recente</option>
            <option value="antigo">Mais antigo</option>
            <option value="saldo">Maior saldo</option>
            <option value="valor">Maior valor</option>
          </select>
        </span>
      </div>

      {/* Resumo + ações de seleção */}
      <div className="flex items-center justify-between gap-3 mb-5 px-1 flex-wrap">
        <div className="text-sm text-ink-soft">
          <b className="text-ink">{totals.qtd}</b> vale{totals.qtd === 1 ? '' : 's'}
          {' · '}
          <span className="text-ink">{formatBRL(totals.valor)}</span>
          {' emitido · '}
          <span className="text-ink">{formatBRL(totals.saldo)}</span>
          {' em saldo'}
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAll}
              className="text-xs font-bold uppercase tracking-wider text-ink-soft hover:text-ink transition"
            >
              {selecionados.size === filtered.length
                ? 'Limpar seleção'
                : 'Selecionar todos'}
            </button>
            {modoSelecao && onPrintLote && (
              <button
                onClick={imprimirLoteAcao}
                className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-ink bg-lulu-yellow text-ink shadow-sticker hover:translate-y-[-1px] transition"
              >
                Imprimir {selecionados.size} selecionado{selecionados.size === 1 ? '' : 's'}
              </button>
            )}
          </div>
        )}
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
              <p className="text-sm">Tenta outro termo, muda o filtro ou o período acima.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <ValeCard
              key={v.id}
              vale={v}
              selecionado={selecionados.has(v.id)}
              modoSelecao={modoSelecao}
              onToggle={() => toggleSelecionado(v.id)}
              onOpen={() => onOpen(v.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ValeCard({
  vale,
  selecionado,
  modoSelecao,
  onOpen,
  onToggle,
}: {
  vale: Vale;
  selecionado: boolean;
  modoSelecao: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const used = vale.valorOriginal - vale.saldo;
  const pct = vale.valorOriginal > 0 ? (used / vale.valorOriginal) * 100 : 0;
  const isUsed = vale.saldo === 0;
  const isDeleted = !!vale.deletadoEm;
  const esgotandoEmBreve =
    !isUsed && !isDeleted && vale.saldo > 0 && vale.saldo <= ESGOTANDO_LIMITE;

  return (
    <div
      className={`relative bg-paper rounded-md p-5 border-2 shadow-sm transition ${
        selecionado ? 'border-lulu-magenta ring-4 ring-lulu-magenta/20' : 'border-line hover:border-lulu-purple-soft hover:shadow-md'
      } ${isDeleted ? 'opacity-60' : ''}`}
    >
      {/* Checkbox de seleção (canto superior direito) */}
      <button
        onClick={onToggle}
        aria-label={selecionado ? 'Desmarcar' : 'Selecionar'}
        className={`absolute top-3 right-3 w-6 h-6 rounded-md border-2 grid place-items-center transition ${
          selecionado
            ? 'bg-lulu-magenta border-lulu-magenta text-white'
            : 'bg-paper border-line hover:border-ink-mute'
        }`}
      >
        {selecionado && (
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="5 10 9 14 16 6" />
          </svg>
        )}
      </button>

      <button
        onClick={modoSelecao ? onToggle : onOpen}
        className="text-left w-full pr-7"
      >
        <div className="flex flex-wrap items-center gap-1 mb-1">
          {isDeleted && (
            <span className="lulu-pill bg-lulu-cheek-pink text-lulu-heart-red">
              Excluído
            </span>
          )}
          {esgotandoEmBreve && (
            <span className="lulu-pill bg-lulu-yellow text-ink">
              Esgota em breve
            </span>
          )}
        </div>
        <div className="font-mono text-xs text-ink-mute tracking-wide font-semibold">
          {vale.id}
        </div>
        <div className="font-bold text-base mt-1 text-ink leading-tight">
          {vale.nome}
        </div>
        <div className="text-sm text-ink-soft mt-0.5">{formatCPF(vale.cpf)}</div>
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
    </div>
  );
}
