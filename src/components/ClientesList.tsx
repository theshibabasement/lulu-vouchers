'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatBRL, formatCPF, formatDate, whatsappLink } from '@/lib/format';
import type { ClienteComAgregados, ClienteTag, TagCor } from '@/lib/types';

type SortKey = 'nome' | 'qtd' | 'gasto' | 'recente';
type ClientesFilter = 'all' | 'deleted';
type ContatoFilter = 'todos' | 'sem-wa' | 'com-vale';

const TAG_COLORS: Record<TagCor, string> = {
  magenta: 'bg-lulu-magenta text-white',
  cyan: 'bg-lulu-cyan text-white',
  yellow: 'bg-lulu-yellow text-ink',
  purple: 'bg-lulu-purple text-white',
  mint: 'bg-lulu-mint text-ink',
  cheek: 'bg-lulu-cheek-pink text-lulu-heart-red',
  ink: 'bg-ink text-white',
};

function tempoDesde(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (dias < 1) return 'hoje';
  if (dias < 30) return `há ${dias} dia${dias === 1 ? '' : 's'}`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `há ${meses} m${meses === 1 ? 'ês' : 'eses'}`;
  const anos = Math.floor(dias / 365);
  return `há ${anos} ano${anos === 1 ? '' : 's'}`;
}

interface Props {
  clientes: ClienteComAgregados[];
  onOpen: (id: number) => void;
  filter: ClientesFilter;
  onFilterChange: (f: ClientesFilter) => void;
}

export function ClientesList({ clientes, onOpen, filter, onFilterChange }: Props) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('nome');
  const [contato, setContato] = useState<ContatoFilter>('todos');
  const [tagFiltro, setTagFiltro] = useState<number | null>(null);
  const [tagsExistentes, setTagsExistentes] = useState<ClienteTag[]>([]);

  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then((j: { tags?: ClienteTag[] }) => setTagsExistentes(j.tags ?? []))
      .catch(() => {});
  }, [clientes.length]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const qDigits = q.replace(/\D/g, '');
    let list =
      filter === 'deleted'
        ? clientes.filter((c) => !!c.deletadoEm)
        : clientes.filter((c) => !c.deletadoEm);
    if (contato === 'sem-wa') {
      list = list.filter((c) => !c.whatsapp);
    } else if (contato === 'com-vale') {
      list = list.filter((c) => c.agregados.qtdAtivos > 0);
    }
    if (tagFiltro !== null) {
      list = list.filter((c) => (c.tags ?? []).some((t) => t.id === tagFiltro));
    }
    if (q) {
      const qHandle = q.replace(/^@/, '');
      list = list.filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          (c.instagram && c.instagram.toLowerCase().includes(qHandle)) ||
          (qDigits && c.cpf.replace(/\D/g, '').includes(qDigits)) ||
          (qDigits && c.whatsapp && c.whatsapp.replace(/\D/g, '').includes(qDigits)),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'qtd':
          return b.agregados.qtdVales - a.agregados.qtdVales;
        case 'gasto':
          return b.agregados.totalEmitido - a.agregados.totalEmitido;
        case 'recente': {
          const aT = a.agregados.ultimaCompra ? new Date(a.agregados.ultimaCompra).getTime() : 0;
          const bT = b.agregados.ultimaCompra ? new Date(b.agregados.ultimaCompra).getTime() : 0;
          return bT - aT;
        }
        default:
          return a.nome.localeCompare(b.nome, 'pt-BR');
      }
    });
    return sorted;
  }, [clientes, query, sort, filter, contato, tagFiltro]);

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
            placeholder="Nome, CPF ou WhatsApp…"
            className="flex-1 py-3 bg-transparent text-base focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {(
            [
              ['nome', 'A–Z'],
              ['qtd', 'Mais trocas'],
              ['gasto', 'Maior crédito'],
              ['recente', 'Recente'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition ${
                sort === k
                  ? 'bg-ink text-white border-ink'
                  : 'bg-paper text-ink-soft border-line hover:border-ink-mute'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 mb-3 flex-wrap">
        {(
          [
            ['all', 'Ativos'],
            ['deleted', 'Excluídos'],
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
        {(
          [
            ['todos', 'Todos contatos'],
            ['com-vale', 'Com vale ativo'],
            ['sem-wa', 'Sem WhatsApp'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setContato(k)}
            className={`px-4 py-2 rounded-full text-xs font-bold border-2 transition ${
              contato === k
                ? 'bg-ink text-white border-ink'
                : 'bg-paper text-ink-soft border-line hover:border-ink-mute'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tagsExistentes.length > 0 && (
        <div className="flex gap-1.5 mb-4 flex-wrap items-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Tags:
          </span>
          <button
            onClick={() => setTagFiltro(null)}
            className={`px-3 py-1 rounded-full text-xs font-bold border-2 transition ${
              tagFiltro === null
                ? 'bg-ink text-white border-ink'
                : 'bg-paper text-ink-soft border-line hover:border-ink-mute'
            }`}
          >
            Todas
          </button>
          {tagsExistentes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTagFiltro(tagFiltro === t.id ? null : t.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold border-2 transition ${
                tagFiltro === t.id
                  ? `${TAG_COLORS[t.cor]} border-ink`
                  : 'bg-paper text-ink-soft border-line hover:border-ink-mute'
              }`}
            >
              {t.nome}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-soft">
          {clientes.length === 0 ? (
            <>
              <div className="font-display text-3xl text-lulu-purple mb-2">
                Nenhum cliente ainda 🩷
              </div>
              <p className="text-sm">
                Os clientes aparecem aqui depois da primeira venda.
              </p>
            </>
          ) : (
            <>
              <div className="font-display text-3xl text-lulu-purple mb-2">
                Nada encontrado
              </div>
              <p className="text-sm">Tenta outro termo.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <ClienteCard key={c.id} cliente={c} onOpen={onOpen} />
          ))}
        </div>
      )}
    </>
  );
}

function ClienteCard({
  cliente,
  onOpen,
}: {
  cliente: ClienteComAgregados;
  onOpen: (id: number) => void;
}) {
  const wa = cliente.whatsapp ? whatsappLink(cliente.whatsapp) : null;
  const isDeleted = !!cliente.deletadoEm;
  const temAtivo = cliente.agregados.qtdAtivos > 0;
  const semWa = !cliente.whatsapp && !isDeleted;

  return (
    <div
      className={`bg-paper rounded-md p-5 border-2 border-line shadow-sm hover:-translate-y-0.5 hover:border-lulu-purple-soft hover:shadow-md transition ${
        isDeleted ? 'opacity-60' : ''
      }`}
    >
      <button
        onClick={() => onOpen(cliente.id)}
        className="text-left w-full"
      >
        <div className="flex flex-wrap gap-1 mb-2">
          {isDeleted && (
            <span className="lulu-pill bg-lulu-cheek-pink text-lulu-heart-red">
              Excluído
            </span>
          )}
          {temAtivo && !isDeleted && (
            <span className="lulu-pill bg-lulu-mint text-ink">
              Vale ativo
            </span>
          )}
          {semWa && (
            <span className="lulu-pill bg-lulu-cheek-pink text-lulu-heart-red">
              Sem WhatsApp
            </span>
          )}
          {(cliente.tags ?? []).map((t) => (
            <span
              key={t.id}
              className={`lulu-pill ${TAG_COLORS[t.cor]}`}
            >
              {t.nome}
            </span>
          ))}
        </div>
        <div className="font-bold text-base text-ink leading-tight">
          {cliente.nome}
        </div>
        <div className="text-sm text-ink-soft mt-0.5 font-mono">
          {formatCPF(cliente.cpf)}
        </div>
        <div className="text-[11px] text-ink-mute mt-0.5">
          Cliente {tempoDesde(cliente.criadoEm)}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <Stat label="Trocas" value={String(cliente.agregados.qtdVales)} />
          <Stat
            label="Crédito"
            value={formatBRL(cliente.agregados.totalEmitido)}
            tone="purple"
          />
          <Stat
            label="Saldo"
            value={formatBRL(cliente.agregados.saldoTotal)}
            tone="magenta"
          />
        </div>

        {cliente.agregados.ultimaCompra && (
          <div className="text-xs text-ink-mute mt-3">
            Última: {formatDate(cliente.agregados.ultimaCompra)}
          </div>
        )}
      </button>

      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-bold bg-lulu-mint text-ink border-2 border-ink/15 hover:border-ink/40 transition"
        >
          <WaIcon /> WhatsApp
        </a>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'magenta' | 'purple';
}) {
  const color =
    tone === 'magenta'
      ? 'text-lulu-magenta'
      : tone === 'purple'
      ? 'text-lulu-purple'
      : 'text-ink';
  return (
    <div>
      <div className={`font-display text-sm font-bold ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-ink-mute font-bold">
        {label}
      </div>
    </div>
  );
}

function WaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.6.1l-.9 1c-.1.2-.3.2-.5.1-.3-.1-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4.1-.1 0-.3 0-.4l-.8-2c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4 0-.7.3-.2.3-.9.9-.9 2.2 0 1.3.9 2.5 1.1 2.7.1.2 1.8 2.7 4.3 3.8.6.3 1.1.4 1.4.5.6.2 1.1.2 1.5.1.5-.1 1.4-.6 1.6-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.4-.3z"/>
      <path d="M20.5 3.5C18.3 1.2 15.3 0 12.1 0 5.5 0 .1 5.4.1 12c0 2.1.6 4.2 1.6 6L0 24l6.2-1.6c1.7.9 3.7 1.4 5.7 1.4h.1c6.6 0 12-5.4 12-12 .1-3.2-1.2-6.2-3.5-8.3zm-8.4 18.5c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-3.7 1 1-3.6-.2-.4c-1-1.6-1.5-3.4-1.5-5.4 0-5.5 4.5-9.9 10-9.9 2.7 0 5.2 1 7 2.9 1.9 1.9 2.9 4.4 2.9 7 0 5.5-4.5 10-9.9 10z"/>
    </svg>
  );
}
