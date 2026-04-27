'use client';

import { useMemo, useState } from 'react';
import type { Avaliacao, AvaliacaoStatus } from '@/lib/types';

interface Props {
  avaliacoes: Avaliacao[];
  onSelectDay: (iso: string, dayAvaliacoes: Avaliacao[]) => void;
  selectedDayIso: string | null;
}

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Soma os pesos dos status pra escolher o tom dominante do dia. */
function corDoDia(items: Avaliacao[]): { bg: string; text: string; ring: string } | null {
  if (items.length === 0) return null;
  const counts: Record<AvaliacaoStatus, number> = {
    pendente: 0, confirmada: 0, realizada: 0, cancelada: 0, no_show: 0,
  };
  for (const a of items) counts[a.status]++;
  if (counts.pendente > 0) return { bg: 'bg-lulu-yellow', text: 'text-ink', ring: 'ring-lulu-yellow' };
  if (counts.confirmada > 0) return { bg: 'bg-lulu-mint', text: 'text-ink', ring: 'ring-lulu-mint' };
  if (counts.realizada > 0) return { bg: 'bg-lulu-purple-soft', text: 'text-lulu-purple', ring: 'ring-lulu-purple-soft' };
  return { bg: 'bg-lulu-cheek-pink', text: 'text-lulu-heart-red', ring: 'ring-lulu-cheek-pink' };
}

export function CalendarioAvaliacoes({ avaliacoes, onSelectDay, selectedDayIso }: Props) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const byDay = useMemo(() => {
    const map = new Map<string, Avaliacao[]>();
    for (const a of avaliacoes) {
      const k = dayKey(new Date(a.dataHora));
      const list = map.get(k) ?? [];
      list.push(a);
      map.set(k, list);
    }
    // Ordena por hora dentro do dia
    for (const list of map.values()) {
      list.sort((x, y) => new Date(x.dataHora).getTime() - new Date(y.dataHora).getTime());
    }
    return map;
  }, [avaliacoes]);

  const grid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startWeekday = first.getDay(); // 0..6 (dom..sáb)
    const totalDays = last.getDate();

    const cells: { date: Date | null; key: string }[] = [];
    // Padding inicial
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null, key: `pad-${i}` });
    // Dias do mês
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      cells.push({ date, key: dayKey(date) });
    }
    // Padding final pra completar 6 linhas (42 cels) — opcional
    while (cells.length % 7 !== 0) cells.push({ date: null, key: `pad-end-${cells.length}` });
    return cells;
  }, [cursor]);

  function prev() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }
  function next() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }
  function goToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <div className="bg-paper rounded-lg border-2 border-line p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          onClick={prev}
          className="w-9 h-9 grid place-items-center rounded-full border-2 border-line hover:border-ink-mute text-ink-soft hover:text-ink transition"
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <div className="font-display text-xl text-lulu-purple text-center flex-1 min-w-0">
          {MESES[cursor.getMonth()]} <span className="text-ink-mute">{cursor.getFullYear()}</span>
        </div>
        <button
          onClick={next}
          className="w-9 h-9 grid place-items-center rounded-full border-2 border-line hover:border-ink-mute text-ink-soft hover:text-ink transition"
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>

      <div className="flex justify-between items-center mb-3">
        <button
          onClick={goToday}
          className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border-2 border-line text-ink-soft hover:border-ink-mute hover:text-ink transition"
        >
          Hoje
        </button>
        <Legenda />
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold uppercase tracking-wider text-ink-mute py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell) => {
          if (!cell.date) {
            return <div key={cell.key} className="aspect-square"></div>;
          }
          const items = byDay.get(cell.key) ?? [];
          const tone = corDoDia(items);
          const isToday = dayKey(cell.date) === dayKey(today);
          const isSelected = selectedDayIso === cell.key;

          return (
            <button
              key={cell.key}
              onClick={() => onSelectDay(cell.key, items)}
              className={`aspect-square rounded-md border-2 transition flex flex-col items-center justify-center relative overflow-hidden ${
                tone
                  ? `${tone.bg} ${tone.text} border-ink/15 hover:border-ink/40`
                  : 'bg-paper text-ink-soft border-line hover:border-ink-mute'
              } ${isSelected ? 'ring-4 ring-ink/40' : ''} ${
                isToday ? 'ring-2 ring-lulu-magenta' : ''
              }`}
            >
              <span className={`text-sm font-bold ${isToday ? 'text-lulu-magenta' : ''}`}>
                {cell.date.getDate()}
              </span>
              {items.length > 0 && (
                <span className="text-[9px] font-bold leading-none mt-0.5 px-1.5 py-0.5 rounded-full bg-ink/15">
                  {items.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Legenda() {
  const items = [
    { color: 'bg-lulu-yellow', label: 'Pendente' },
    { color: 'bg-lulu-mint', label: 'Confirmada' },
    { color: 'bg-lulu-purple-soft', label: 'Realizada' },
    { color: 'bg-lulu-cheek-pink', label: 'Cancelada' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px]">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1 text-ink-soft">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${it.color}`}></span>
          {it.label}
        </span>
      ))}
    </div>
  );
}
