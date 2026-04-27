'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatBRL, formatCPF } from '@/lib/format';

interface Geral {
  totalEmitido: number;
  totalAbatido: number;
  saldoCirculacao: number;
  qtdVales: number;
  qtdAtivos: number;
  qtdEsgotados: number;
  qtdClientes: number;
  qtdAvaliacoesPendentes: number;
  qtdAvaliacoesConfirmadas: number;
}

interface PorMes {
  mes: string; // YYYY-MM
  emitido: number;
  abatido: number;
  qtdVales: number;
  qtdAbatimentos: number;
}

interface TopCliente {
  id: number;
  nome: string;
  cpf: string;
  totalEmitido: number;
  qtdVales: number;
}

interface Hoje {
  valesEmitidos: number;
  valorEmitido: number;
  valesAbatidos: number;
  valorAbatido: number;
}

interface DashboardData {
  geral: Geral;
  porMes: PorMes[];
  topClientes: TopCliente[];
  hoje: Hoje;
}

const MESES_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function formatMonthLabel(ymd: string): string {
  const [y, m] = ymd.split('-');
  return `${MESES_ABBR[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

interface Props {
  onOpenCliente?: (id: number) => void;
}

export function Dashboard({ onOpenCliente }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const now = new Date();
  const [ano, setAno] = useState<number>(now.getFullYear());
  const [mes, setMes] = useState<number>(now.getMonth() + 1);

  useEffect(() => {
    fetch('/api/metricas', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: DashboardData) => {
        setData(j);
        setErr(null);
      })
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  async function downloadRelatorio(formato: 'csv' | 'json') {
    setDownloading(true);
    try {
      const r = await fetch(`/api/relatorio-mensal?ano=${ano}&mes=${mes}&formato=${formato}`);
      if (!r.ok) throw new Error('Falha ao gerar relatório.');
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `relatorio-lulu-${ano}-${String(mes).padStart(2, '0')}.${formato}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return <div className="text-ink-soft text-sm">Carregando métricas…</div>;
  }
  if (err || !data) {
    return (
      <div className="rounded-md bg-lulu-cheek-pink/40 border-2 border-lulu-heart-red px-3 py-2 text-sm text-ink">
        {err || 'Erro ao carregar.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hoje + Geral */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="Hoje · Vales emitidos" value={String(data.hoje.valesEmitidos)} sub={formatBRL(data.hoje.valorEmitido)} tone="purple" />
        <Card title="Hoje · Descontos aplicados" value={String(data.hoje.valesAbatidos)} sub={formatBRL(data.hoje.valorAbatido)} tone="cyan" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Saldo em circulação" value={formatBRL(data.geral.saldoCirculacao)} tone="magenta" />
        <Stat label="Total emitido" value={formatBRL(data.geral.totalEmitido)} tone="purple" />
        <Stat label="Total descontado" value={formatBRL(data.geral.totalAbatido)} tone="cyan" />
        <Stat label="Vales ativos" value={String(data.geral.qtdAtivos)} sub={`de ${data.geral.qtdVales}`} tone="ink" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Clientes cadastrados" value={String(data.geral.qtdClientes)} tone="ink" />
        <Stat label="Vales esgotados" value={String(data.geral.qtdEsgotados)} tone="ink" />
        <Stat label="Avaliações pendentes" value={String(data.geral.qtdAvaliacoesPendentes)} tone="yellow" />
        <Stat label="Avaliações confirmadas" value={String(data.geral.qtdAvaliacoesConfirmadas)} tone="mint" />
      </div>

      {/* Gráfico por mês */}
      <BarChart porMes={data.porMes} />

      {/* Top clientes */}
      <section className="bg-paper rounded-lg p-5 border-2 border-line shadow-sm">
        <h3 className="font-display text-xl text-lulu-purple mb-3">Top 10 clientes</h3>
        {data.topClientes.length === 0 ? (
          <p className="text-sm text-ink-soft">Sem dados ainda.</p>
        ) : (
          <ol className="divide-y divide-line">
            {data.topClientes.map((c, i) => (
              <li key={c.id}>
                <button
                  onClick={() => onOpenCliente?.(c.id)}
                  className="w-full text-left flex items-center justify-between gap-3 py-2.5 hover:bg-paper-tint -mx-2 px-2 rounded transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-display font-bold text-lulu-purple text-lg w-6 text-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-ink truncate">{c.nome}</div>
                      <div className="text-xs text-ink-soft font-mono">
                        {formatCPF(c.cpf)} · {c.qtdVales} vale{c.qtdVales === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                  <div className="font-display font-bold text-lulu-magenta text-base whitespace-nowrap">
                    {formatBRL(c.totalEmitido)}
                  </div>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Relatório fiscal mensal */}
      <section className="bg-paper rounded-lg p-5 border-2 border-line shadow-sm">
        <h3 className="font-display text-xl text-lulu-purple mb-3">Relatório fiscal mensal</h3>
        <p className="text-sm text-ink-soft mb-4">
          Exporta tudo do mês escolhido (vales emitidos + abatimentos).
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="lulu-label">Ano</label>
            <input
              type="number"
              min={2000}
              max={9999}
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value, 10) || ano)}
              className="lulu-input"
            />
          </div>
          <div>
            <label className="lulu-label">Mês</label>
            <select
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value, 10))}
              className="lulu-input"
            >
              {MESES_ABBR.map((m, i) => (
                <option key={i} value={i + 1}>
                  {i + 1} · {m}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => downloadRelatorio('csv')}
            disabled={downloading}
            className="lulu-btn-primary disabled:opacity-60"
          >
            {downloading ? 'Gerando…' : 'Baixar CSV'}
          </button>
          <button
            onClick={() => downloadRelatorio('json')}
            disabled={downloading}
            className="lulu-btn-secondary disabled:opacity-60"
          >
            Baixar JSON
          </button>
        </div>
      </section>
    </div>
  );
}

function Card({ title, value, sub, tone }: { title: string; value: string; sub?: string; tone: 'purple' | 'cyan' | 'magenta' }) {
  const bg =
    tone === 'purple'
      ? 'from-lulu-purple to-lulu-magenta'
      : tone === 'cyan'
      ? 'from-lulu-cyan to-lulu-purple'
      : 'from-lulu-magenta to-lulu-heart-red';
  return (
    <div className={`rounded-xl p-5 bg-gradient-to-br ${bg} text-white shadow-md`}>
      <div className="text-xs uppercase tracking-[0.16em] opacity-85">{title}</div>
      <div className="font-display text-4xl font-extrabold my-1">{value}</div>
      {sub && <div className="text-sm opacity-90">{sub}</div>}
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'magenta' | 'purple' | 'cyan' | 'ink' | 'yellow' | 'mint' }) {
  const color =
    tone === 'magenta' ? 'text-lulu-magenta'
    : tone === 'purple' ? 'text-lulu-purple'
    : tone === 'cyan' ? 'text-lulu-cyan'
    : tone === 'yellow' ? 'text-ink'
    : tone === 'mint' ? 'text-ink'
    : 'text-ink';
  const bg =
    tone === 'yellow' ? 'bg-lulu-yellow/30 border-lulu-yellow'
    : tone === 'mint' ? 'bg-lulu-mint/30 border-lulu-mint'
    : 'bg-paper border-line';
  return (
    <div className={`rounded-md p-4 border-2 ${bg}`}>
      <div className="text-[10px] uppercase tracking-wider font-bold text-ink-soft">{label}</div>
      <div className={`font-display text-2xl font-bold mt-1 ${color}`}>{value}</div>
      {sub && <div className="text-xs text-ink-mute mt-0.5">{sub}</div>}
    </div>
  );
}

function BarChart({ porMes }: { porMes: PorMes[] }) {
  const maxValue = useMemo(() => {
    let m = 0;
    for (const r of porMes) m = Math.max(m, r.emitido, r.abatido);
    return m || 1;
  }, [porMes]);

  return (
    <section className="bg-paper rounded-lg p-5 border-2 border-line shadow-sm">
      <h3 className="font-display text-xl text-lulu-purple mb-1">Últimos 12 meses</h3>
      <div className="flex items-center gap-4 text-[11px] text-ink-soft mb-4">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-lulu-purple"></span>
          Emitido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-lulu-cyan"></span>
          Descontado
        </span>
      </div>
      {porMes.length === 0 ? (
        <p className="text-sm text-ink-soft">Sem dados ainda.</p>
      ) : (
        <div className="flex items-end justify-between gap-2 h-48">
          {porMes.map((r) => {
            const hEmit = Math.max(2, (r.emitido / maxValue) * 100);
            const hAbat = Math.max(0, (r.abatido / maxValue) * 100);
            return (
              <div key={r.mes} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="flex items-end gap-0.5 h-40 w-full justify-center">
                  <div
                    className="w-3 sm:w-4 bg-lulu-purple rounded-t"
                    style={{ height: `${hEmit}%` }}
                    title={`Emitido: ${formatBRL(r.emitido)}`}
                  />
                  <div
                    className="w-3 sm:w-4 bg-lulu-cyan rounded-t"
                    style={{ height: `${hAbat}%` }}
                    title={`Descontado: ${formatBRL(r.abatido)}`}
                  />
                </div>
                <div className="text-[10px] text-ink-mute font-bold uppercase tracking-wide">
                  {formatMonthLabel(r.mes)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
