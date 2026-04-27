'use client';

import { useEffect, useState } from 'react';

interface DiaFechado {
  data: string; // YYYY-MM-DD
  motivo: string | null;
  criadoEm: string;
}

interface Props {
  onClose: () => void;
  onChanged?: () => void;
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function DiasFechadosManager({ onClose, onChanged }: Props) {
  const [dias, setDias] = useState<DiaFechado[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaData, setNovaData] = useState('');
  const [novoMotivo, setNovoMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/dias-fechados', { cache: 'no-store' });
      const j = (await r.json()) as { dias?: DiaFechado[] };
      setDias(j.dias ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function adicionar() {
    if (!novaData) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/dias-fechados', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: novaData, motivo: novoMotivo || undefined }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error || 'Falha ao adicionar.');
      setNovaData('');
      setNovoMotivo('');
      await load();
      onChanged?.();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remover(data: string) {
    if (!confirm(`Remover bloqueio do dia ${formatDateBR(data)}?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/dias-fechados/${data}`, { method: 'DELETE' });
      await load();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur z-[150] grid place-items-center px-4 py-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-lg max-w-md w-full p-6 border-[3px] border-ink shadow-sticker-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-2xl text-lulu-purple mb-1">
          Dias fechados
        </h3>
        <p className="text-sm text-ink-soft mb-4">
          Marca os dias que a Lulu não atende. Cliente não consegue agendar
          online nesses dias.
        </p>

        <div className="grid grid-cols-1 gap-2 mb-3">
          <div>
            <label className="lulu-label">Data</label>
            <input
              type="date"
              min={hoje}
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              className="lulu-input"
            />
          </div>
          <div>
            <label className="lulu-label">Motivo (opcional)</label>
            <input
              value={novoMotivo}
              onChange={(e) => setNovoMotivo(e.target.value)}
              placeholder="ex: feriado, viagem"
              className="lulu-input"
            />
          </div>
          <button
            onClick={adicionar}
            disabled={busy || !novaData}
            className="lulu-btn-primary disabled:opacity-60"
          >
            Adicionar
          </button>
        </div>

        {err && (
          <div className="rounded-md bg-lulu-cheek-pink/40 border-2 border-lulu-heart-red px-3 py-2 text-sm text-ink mb-3">
            {err}
          </div>
        )}

        <div className="border-t border-line pt-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-2">
            Bloqueados
          </p>
          {loading ? (
            <p className="text-sm text-ink-soft">Carregando…</p>
          ) : dias.length === 0 ? (
            <p className="text-sm text-ink-soft">Nenhum dia bloqueado.</p>
          ) : (
            <ul className="space-y-1.5">
              {dias.map((d) => (
                <li
                  key={d.data}
                  className="flex items-center justify-between gap-2 bg-paper-tint border border-line rounded-md px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-ink">{formatDateBR(d.data)}</div>
                    {d.motivo && (
                      <div className="text-xs text-ink-soft truncate">{d.motivo}</div>
                    )}
                  </div>
                  <button
                    onClick={() => remover(d.data)}
                    disabled={busy}
                    className="text-xs font-bold text-ink-mute hover:text-lulu-heart-red transition"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button onClick={onClose} className="lulu-btn-secondary w-full mt-4">
          Fechar
        </button>
      </div>
    </div>
  );
}
