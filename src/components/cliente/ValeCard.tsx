'use client';

import { formatBRL, formatDate } from '@/lib/format';
import type { Vale } from '@/lib/types';

interface Props {
  vale: Vale;
  onOpen: () => void;
}

export function ValeCard({ vale, onOpen }: Props) {
  const used = vale.valorOriginal - vale.saldo;
  const pct = vale.valorOriginal > 0 ? (used / vale.valorOriginal) * 100 : 0;
  const isUsed = vale.saldo === 0;

  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-paper rounded-lg p-5 border-2 border-line shadow-sm hover:border-lulu-purple-soft hover:shadow-md transition"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-mono text-xs text-ink-mute font-semibold tracking-wide">
          {vale.id}
        </div>
        <div className="text-xs text-ink-mute">
          {formatDate(vale.criadoEm)}
        </div>
      </div>

      <div className="flex items-baseline justify-between mt-3 gap-3">
        <div
          className={`font-display text-3xl font-bold ${
            isUsed ? 'text-ink-mute line-through' : 'text-lulu-magenta'
          }`}
        >
          {formatBRL(vale.saldo)}
        </div>
        <div className="text-xs text-ink-soft text-right">
          de {formatBRL(vale.valorOriginal)}
        </div>
      </div>

      <div className="h-1.5 bg-line rounded-full mt-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isUsed ? 'bg-lulu-cyan' : 'bg-lulu-magenta'
          }`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      <div className="text-xs text-lulu-purple font-bold mt-3">
        Toca pra ver QR e histórico →
      </div>
    </button>
  );
}
