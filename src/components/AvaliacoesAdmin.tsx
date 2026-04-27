'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarioAvaliacoes } from './CalendarioAvaliacoes';
import { HorariosConfig } from './HorariosConfig';
import { formatCPF, formatDate, formatDateTime, whatsappLink } from '@/lib/format';
import type { Avaliacao, AvaliacaoStatus } from '@/lib/types';

const STATUS_LABEL: Record<AvaliacaoStatus, string> = {
  pendente: 'Pendente',
  confirmada: 'Confirmada',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
  no_show: 'Não compareceu',
};

const STATUS_TONE: Record<AvaliacaoStatus, string> = {
  pendente: 'bg-lulu-yellow text-ink',
  confirmada: 'bg-lulu-mint text-ink',
  realizada: 'bg-lulu-purple-soft text-lulu-purple',
  cancelada: 'bg-lulu-cheek-pink text-lulu-heart-red',
  no_show: 'bg-lulu-cheek-pink text-lulu-heart-red',
};

interface Props {
  onToast: (msg: string, kind?: 'success' | 'error') => void;
}

export function AvaliacoesAdmin({ onToast }: Props) {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'futuras' | 'calendario' | 'pendentes' | 'hoje'>('calendario');
  const [selectedDay, setSelectedDay] = useState<string | null>(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  });
  const [showHorarios, setShowHorarios] = useState(false);
  const [query, setQuery] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/avaliacoes', { cache: 'no-store' });
      const j = (await r.json()) as { avaliacoes: Avaliacao[] };
      setAvaliacoes(j.avaliacoes ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Aplica busca por nome ou CPF (cross-cutting — afeta todas as views)
  const buscaFiltrada = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return avaliacoes;
    const qDigits = q.replace(/\D/g, '');
    return avaliacoes.filter(
      (a) =>
        a.nome.toLowerCase().includes(q) ||
        (qDigits && a.cpf && a.cpf.replace(/\D/g, '').includes(qDigits)) ||
        (qDigits && a.whatsapp && a.whatsapp.replace(/\D/g, '').includes(qDigits)),
    );
  }, [avaliacoes, query]);

  const filtered = useMemo(() => {
    const now = Date.now();
    switch (filtro) {
      case 'pendentes':
        return buscaFiltrada.filter((a) => a.status === 'pendente');
      case 'hoje': {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return buscaFiltrada.filter((a) => {
          const t = new Date(a.dataHora).getTime();
          return t >= start.getTime() && t <= end.getTime();
        });
      }
      case 'calendario': {
        if (!selectedDay) return [];
        return buscaFiltrada.filter((a) => {
          const d = new Date(a.dataHora);
          const p = (n: number) => String(n).padStart(2, '0');
          const k = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
          return k === selectedDay;
        });
      }
      case 'futuras':
      default:
        return buscaFiltrada.filter((a) => new Date(a.dataHora).getTime() >= now - 1000 * 60 * 60);
    }
  }, [buscaFiltrada, filtro, selectedDay]);

  // Próximas 2h — útil pro dia a dia
  const proximas2h = useMemo(() => {
    const now = Date.now();
    const limite = now + 2 * 60 * 60 * 1000;
    return avaliacoes
      .filter(
        (a) =>
          (a.status === 'confirmada' || a.status === 'pendente') &&
          new Date(a.dataHora).getTime() >= now - 5 * 60 * 1000 &&
          new Date(a.dataHora).getTime() <= limite,
      )
      .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
  }, [avaliacoes]);

  // Sumário do mês corrente
  const sumarioMes = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    const doMes = avaliacoes.filter((a) => {
      const t = new Date(a.dataHora).getTime();
      return t >= start && t < end;
    });
    const c: Record<AvaliacaoStatus, number> = {
      pendente: 0, confirmada: 0, realizada: 0, cancelada: 0, no_show: 0,
    };
    for (const a of doMes) c[a.status]++;
    return { total: doMes.length, ...c };
  }, [avaliacoes]);

  // Agrupa por dia
  const grouped = useMemo(() => {
    const map = new Map<string, Avaliacao[]>();
    for (const a of filtered) {
      const key = formatDate(a.dataHora);
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtered]);

  async function setStatus(a: Avaliacao, status: AvaliacaoStatus) {
    try {
      const r = await fetch(`/api/avaliacoes/${a.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error || 'Falha.');
      onToast(`Status atualizado: ${STATUS_LABEL[status]}`, 'success');
      load();
    } catch (e) {
      onToast((e as Error).message, 'error');
    }
  }

  async function remover(a: Avaliacao) {
    if (!confirm(`Remover agendamento de ${a.nome} em ${formatDateTime(a.dataHora)}?`)) return;
    try {
      const r = await fetch(`/api/avaliacoes/${a.id}`, { method: 'DELETE' });
      if (!r.ok) {
        const j = (await r.json()) as { error?: string };
        throw new Error(j.error || 'Falha.');
      }
      onToast('Removido.', 'success');
      load();
    } catch (e) {
      onToast((e as Error).message, 'error');
    }
  }

  return (
    <>
      {/* Próximas 2h (alerta no topo) */}
      {proximas2h.length > 0 && (
        <div className="mb-5 rounded-lg bg-lulu-yellow/40 border-2 border-lulu-yellow p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-display font-bold text-ink">
              Próximas 2 horas
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              {proximas2h.length} agendamento{proximas2h.length === 1 ? '' : 's'}
            </span>
          </div>
          <ul className="space-y-1.5">
            {proximas2h.map((a) => {
              const hora = new Date(a.dataHora).toLocaleTimeString('pt-BR', {
                hour: '2-digit', minute: '2-digit',
              });
              return (
                <li key={a.id} className="text-sm flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-lulu-purple">{hora}</span>
                  <span className="font-bold text-ink">{a.nome}</span>
                  <span className={`lulu-pill ${STATUS_TONE[a.status]}`}>
                    {STATUS_LABEL[a.status]}
                  </span>
                  {!a.whatsapp && (
                    <span className="text-[10px] font-bold text-lulu-heart-red uppercase tracking-wider">
                      sem WhatsApp
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Sumário do mês corrente */}
      <div className="mb-5 rounded-lg bg-paper border-2 border-line p-3 flex flex-wrap gap-3 items-center text-xs">
        <span className="font-bold uppercase tracking-wider text-ink-soft">
          Este mês:
        </span>
        <span className="text-ink"><b>{sumarioMes.total}</b> total</span>
        <SummaryPill color="bg-lulu-yellow text-ink" label="pendentes" n={sumarioMes.pendente} />
        <SummaryPill color="bg-lulu-mint text-ink" label="confirmadas" n={sumarioMes.confirmada} />
        <SummaryPill color="bg-lulu-purple-soft text-lulu-purple" label="realizadas" n={sumarioMes.realizada} />
        <SummaryPill color="bg-lulu-cheek-pink text-lulu-heart-red" label="canceladas" n={sumarioMes.cancelada + sumarioMes.no_show} />
      </div>

      {/* Busca */}
      <div className="mb-4 flex items-center gap-2 bg-paper rounded-md border-2 border-line focus-within:border-lulu-magenta focus-within:ring-4 focus-within:ring-lulu-magenta/15 px-4 transition shadow-sm">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-mute">
          <circle cx="11" cy="11" r="7"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, CPF ou WhatsApp…"
          className="flex-1 py-3 bg-transparent text-base focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="text-xs font-bold text-ink-mute hover:text-ink"
          >
            ✕ limpar
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {(
          [
            ['calendario', 'Calendário'],
            ['hoje', 'Hoje'],
            ['futuras', 'Próximas'],
            ['pendentes', 'Pendentes'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => {
              setFiltro(k);
              if (k !== 'calendario') setSelectedDay(null);
            }}
            className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition ${
              filtro === k
                ? 'bg-ink text-white border-ink'
                : 'bg-paper text-ink-soft border-line hover:border-ink-mute'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setShowHorarios(true)}
          className="ml-auto px-4 py-2 rounded-full text-sm font-bold border-2 border-lulu-purple-soft bg-paper text-lulu-purple hover:border-lulu-purple transition"
        >
          ⚙ Horários
        </button>
        <button
          onClick={load}
          className="px-4 py-2 rounded-full text-sm font-bold border-2 border-line bg-paper text-ink-soft hover:border-ink-mute transition"
        >
          ↻ Recarregar
        </button>
      </div>

      {showHorarios && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur z-[140] grid place-items-center px-4 py-6 overflow-y-auto"
          onClick={() => setShowHorarios(false)}
        >
          <div
            className="bg-paper-sparkle rounded-lg max-w-2xl w-full p-6 border-[3px] border-ink shadow-sticker-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl text-lulu-purple">
                Configurar horários
              </h2>
              <button
                onClick={() => setShowHorarios(false)}
                className="text-2xl text-ink-mute hover:text-ink hover:bg-paper-tint w-9 h-9 rounded-md transition"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <HorariosConfig onToast={onToast} />
          </div>
        </div>
      )}

      {loading && <div className="text-ink-soft text-sm">Carregando…</div>}

      {filtro === 'calendario' && (
        <div className="mb-6">
          <CalendarioAvaliacoes
            avaliacoes={avaliacoes}
            selectedDayIso={selectedDay}
            onSelectDay={(iso) => setSelectedDay(iso)}
          />
          {selectedDay && filtered.length === 0 && (
            <div className="text-center py-10 text-ink-soft">
              <p className="text-sm">Nenhuma avaliação nesse dia.</p>
            </div>
          )}
          {!selectedDay && (
            <div className="text-center py-8 text-ink-soft text-sm">
              Toca num dia colorido pra ver as avaliações.
            </div>
          )}
        </div>
      )}

      {!loading && filtro !== 'calendario' && filtered.length === 0 && (
        <div className="text-center py-16 text-ink-soft">
          <div className="font-display text-3xl text-lulu-purple mb-2">
            Nenhuma avaliação 🩷
          </div>
          <p className="text-sm">Os agendamentos aparecem aqui.</p>
        </div>
      )}

      <div className="space-y-6">
        {grouped.map(([day, items]) => (
          <div key={day}>
            <h3 className="font-display text-xl text-lulu-purple mb-3 sticky top-0 bg-paper-sparkle py-2 z-[1]">
              {day}
            </h3>
            <div className="space-y-2">
              {items.map((a) => (
                <AvaliacaoCard
                  key={a.id}
                  a={a}
                  onStatus={(s) => setStatus(a, s)}
                  onRemove={() => remover(a)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AvaliacaoCard({
  a,
  onStatus,
  onRemove,
}: {
  a: Avaliacao;
  onStatus: (s: AvaliacaoStatus) => void;
  onRemove: () => void;
}) {
  const wa = a.whatsapp ? whatsappLink(a.whatsapp) : null;
  const hora = new Date(a.dataHora).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  function firstName(n: string): string {
    return n.split(/\s+/)[0] || n;
  }

  function buildConfirmationText(): string {
    // Sem emojis — alguns clientes WhatsApp renderizam como "?".
    // Texto puro com acentos passa bem em todos.
    const linhas: string[] = [
      `Oi ${firstName(a.nome)}! Sua avaliação aqui na Lulu Arteira já está confirmada!`,
      `Data: ${formatDate(a.dataHora)}`,
      `Hora: ${hora}`,
    ];
    if (a.qtdPecas) linhas.push(`Qtd. peças (aproximado): ${a.qtdPecas}`);
    if (a.tamanhos.length > 0) linhas.push(`Tamanhos: ${a.tamanhos.join(', ')}`);
    linhas.push(`Endereço: R. Evaristo de Antoni, 2337 - São José, Caxias do Sul - RS, 95032-410`);
    linhas.push(`https://share.google/JmIHTFYgOD49YyuOW`);
    linhas.push(``);
    linhas.push(`Te esperamos!`);
    return linhas.join('\n');
  }

  /**
   * Click handler do <a target="_blank"> que confirma a avaliação no servidor
   * em background (fire-and-forget) e deixa o browser navegar pra wa.me.
   * Não usar window.open após await — o gesture do click se perde e o
   * browser pode bloquear.
   */
  function onConfirmarClick() {
    onStatus('confirmada');
  }

  const confirmacaoUrl = wa ? `${wa}?text=${encodeURIComponent(buildConfirmationText())}` : null;

  return (
    <div className="bg-paper rounded-md p-4 border-2 border-line">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-display text-xl font-bold text-lulu-purple">{hora}</span>
            <span className="font-bold text-ink truncate">{a.nome}</span>
          </div>
          <div className="text-xs text-ink-soft mt-0.5">
            {a.cpf ? formatCPF(a.cpf) : 'sem CPF'}
            {a.qtdPecas ? ` · ${a.qtdPecas} peças` : ''}
            {!a.whatsapp && (
              <span className="ml-2 text-lulu-heart-red font-bold">
                · sem WhatsApp
              </span>
            )}
          </div>
          {a.tamanhos.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {a.tamanhos.map((t) => (
                <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded bg-paper-tint border border-line">
                  {t}
                </span>
              ))}
            </div>
          )}
          {a.observacoes && (
            <div className="text-xs text-ink-soft mt-2 italic">"{a.observacoes}"</div>
          )}
        </div>
        <span className={`lulu-pill ${STATUS_TONE[a.status]}`}>
          {STATUS_LABEL[a.status]}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {a.status === 'pendente' && (
          confirmacaoUrl ? (
            <a
              href={confirmacaoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onConfirmarClick}
              className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-ink bg-lulu-mint text-ink shadow-sticker hover:translate-y-[-1px] transition inline-block"
            >
              Confirmar + WhatsApp
            </a>
          ) : (
            <button
              onClick={() => onStatus('confirmada')}
              className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-lulu-mint bg-paper text-ink hover:bg-lulu-mint/30 transition"
              title="Cliente sem WhatsApp — confirma sem notificar"
            >
              Confirmar
            </button>
          )
        )}
        {(a.status === 'pendente' || a.status === 'confirmada') && (
          <>
            <button onClick={() => onStatus('realizada')} className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-lulu-purple-soft bg-paper text-lulu-purple hover:bg-lulu-purple-soft/30 transition">
              Marcar como realizada
            </button>
            <button onClick={() => onStatus('no_show')} className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-lulu-cheek-pink bg-paper text-lulu-heart-red hover:bg-lulu-cheek-pink/30 transition">
              Não compareceu
            </button>
            <button onClick={() => onStatus('cancelada')} className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-line bg-paper text-ink-soft hover:bg-paper-tint transition">
              Cancelar
            </button>
          </>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-ink/15 bg-paper text-ink hover:bg-lulu-mint/30 hover:border-ink/40 transition ml-auto"
          >
            Abrir conversa
          </a>
        )}
        <button onClick={onRemove} className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-line bg-paper text-ink-mute hover:text-lulu-heart-red hover:border-lulu-heart-red transition">
          Remover
        </button>
      </div>
    </div>
  );
}

function SummaryPill({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold ${color}`}
    >
      <span className="text-sm">{n}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-90">{label}</span>
    </span>
  );
}
