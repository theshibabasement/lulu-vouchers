'use client';

import { useEffect, useState } from 'react';
import type { ClienteTag, TagCor } from '@/lib/types';

const TAG_COLORS: Record<TagCor, string> = {
  magenta: 'bg-lulu-magenta text-white',
  cyan: 'bg-lulu-cyan text-white',
  yellow: 'bg-lulu-yellow text-ink',
  purple: 'bg-lulu-purple text-white',
  mint: 'bg-lulu-mint text-ink',
  cheek: 'bg-lulu-cheek-pink text-lulu-heart-red',
  ink: 'bg-ink text-white',
};

const COR_OPTIONS: TagCor[] = ['magenta', 'cyan', 'yellow', 'purple', 'mint', 'cheek', 'ink'];

interface Props {
  clienteId: number;
  onChanged?: () => void;
}

export function TagsEditor({ clienteId, onChanged }: Props) {
  const [todas, setTodas] = useState<ClienteTag[]>([]);
  const [doCliente, setDoCliente] = useState<ClienteTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState('');
  const [novoCor, setNovoCor] = useState<TagCor>('magenta');
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [tagsRes, clienteTagsRes] = await Promise.all([
        fetch('/api/tags').then((r) => r.json()),
        fetch(`/api/clientes/${clienteId}/tags`).then((r) => r.json()),
      ]);
      setTodas(tagsRes.tags ?? []);
      setDoCliente(clienteTagsRes.tags ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [clienteId]);

  async function adicionar(tagId: number) {
    setBusy(true);
    try {
      await fetch(`/api/clientes/${clienteId}/tags`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tagId }),
      });
      await load();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  async function remover(tagId: number) {
    setBusy(true);
    try {
      await fetch(`/api/clientes/${clienteId}/tags/${tagId}`, { method: 'DELETE' });
      await load();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  async function criarECarregar() {
    if (!novoNome.trim()) return;
    setBusy(true);
    try {
      const r = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nome: novoNome.trim(), cor: novoCor }),
      });
      const j = (await r.json()) as { tag?: ClienteTag };
      if (j.tag) {
        await adicionar(j.tag.id);
        setNovoNome('');
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-ink-soft">Carregando tags…</p>;

  const disponiveis = todas.filter((t) => !doCliente.some((d) => d.id === t.id));

  return (
    <div className="space-y-3">
      {doCliente.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {doCliente.map((t) => (
            <span
              key={t.id}
              className={`lulu-pill ${TAG_COLORS[t.cor]} flex items-center gap-1.5`}
            >
              {t.nome}
              <button
                onClick={() => remover(t.id)}
                disabled={busy}
                aria-label={`Remover tag ${t.nome}`}
                className="opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {disponiveis.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1.5">
            Adicionar:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {disponiveis.map((t) => (
              <button
                key={t.id}
                onClick={() => adicionar(t.id)}
                disabled={busy}
                className={`px-3 py-1 rounded-full text-xs font-bold border-2 border-line bg-paper text-ink-soft hover:border-ink-mute transition disabled:opacity-50`}
              >
                + {t.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-line">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1.5">
          Criar nova tag:
        </p>
        <div className="flex gap-2 flex-wrap">
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="ex: VIP, atacado…"
            className="lulu-input flex-1 min-w-[140px]"
          />
          <select
            value={novoCor}
            onChange={(e) => setNovoCor(e.target.value as TagCor)}
            className="lulu-input"
          >
            {COR_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={criarECarregar}
            disabled={busy || !novoNome.trim()}
            className="lulu-btn-secondary disabled:opacity-50"
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}
