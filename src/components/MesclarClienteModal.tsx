'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatCPF } from '@/lib/format';
import type { Cliente, ClienteComAgregados } from '@/lib/types';

interface Props {
  source: Cliente;
  onClose: () => void;
  onMesclado: () => void;
}

export function MesclarClienteModal({ source, onClose, onMesclado }: Props) {
  const [clientes, setClientes] = useState<ClienteComAgregados[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [targetId, setTargetId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/clientes', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { clientes?: ClienteComAgregados[] }) => {
        setClientes(j.clientes ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const opcoes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return clientes
      .filter((c) => c.id !== source.id && !c.deletadoEm)
      .filter((c) => {
        if (!q) return true;
        return (
          c.nome.toLowerCase().includes(q) ||
          (qDigits && c.cpf.replace(/\D/g, '').includes(qDigits))
        );
      })
      .slice(0, 30);
  }, [clientes, query, source.id]);

  const target = clientes.find((c) => c.id === targetId);

  async function confirmar() {
    if (!targetId) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/clientes/${source.id}/mesclar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetId }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error || 'Falha ao mesclar.');
      onMesclado();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur z-[160] grid place-items-center px-4 py-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-lg max-w-lg w-full p-6 border-[3px] border-ink shadow-sticker-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-2xl text-lulu-purple mb-2">
          Mesclar cliente
        </h3>
        <p className="text-sm text-ink-soft mb-4">
          Origem: <b className="text-ink">{source.nome}</b> · {formatCPF(source.cpf)}
          <br />
          Os vales, avaliações e tags vão pro cliente destino. A origem
          fica marcada como excluída.
        </p>

        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar destino por nome ou CPF…"
          className="lulu-input mb-3"
        />

        {loading ? (
          <p className="text-sm text-ink-soft">Carregando clientes…</p>
        ) : opcoes.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhum cliente encontrado.</p>
        ) : (
          <ul className="max-h-64 overflow-y-auto divide-y divide-line border-2 border-line rounded-md">
            {opcoes.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setTargetId(c.id)}
                  className={`w-full text-left flex items-center justify-between gap-3 px-3 py-2 hover:bg-paper-tint transition ${
                    targetId === c.id ? 'bg-lulu-purple-soft/30' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-bold text-ink truncate">{c.nome}</div>
                    <div className="text-xs text-ink-soft font-mono">
                      {formatCPF(c.cpf)}
                    </div>
                  </div>
                  {targetId === c.id && (
                    <span className="text-lulu-purple font-bold text-lg">✓</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {err && (
          <div className="rounded-md bg-lulu-cheek-pink/40 border-2 border-lulu-heart-red px-3 py-2 text-sm text-ink mt-3">
            {err}
          </div>
        )}

        {target && (
          <div className="mt-4 rounded-md bg-paper-tint border-2 border-line p-3 text-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1">
              Vai mesclar:
            </div>
            <div>
              <b>{source.nome}</b> ({formatCPF(source.cpf)}) →{' '}
              <b>{target.nome}</b> ({formatCPF(target.cpf)})
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mt-5">
          <button onClick={onClose} disabled={busy} className="lulu-btn-secondary">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={busy || !targetId}
            className="lulu-btn-primary disabled:opacity-50"
          >
            {busy ? 'Mesclando…' : 'Confirmar mesclagem'}
          </button>
        </div>
      </div>
    </div>
  );
}
