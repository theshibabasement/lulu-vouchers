'use client';

import { useCallback, useEffect, useState } from 'react';
import { NovaVendaForm } from './NovaVendaForm';
import { ValesList } from './ValesList';
import { ValeDetail } from './ValeDetail';
import { PrintArea } from './PrintArea';
import { ToastStack, type ToastMsg } from './Toast';
import type { Vale } from '@/lib/types';
import type { ReceiptData } from './Receipt';

interface Props {
  initialVales: Vale[];
}

type View = 'nova' | 'vales';
type PrintMode = 'ambas' | 'cliente' | 'loja';

export function AppShell({ initialVales }: Props) {
  const [view, setView] = useState<View>('nova');
  const [vales, setVales] = useState<Vale[]>(initialVales);
  const [detail, setDetail] = useState<Vale | null>(null);
  const [print, setPrint] = useState<{ data: ReceiptData; mode: PrintMode } | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const pushToast = useCallback(
    (msg: string, kind?: ToastMsg['kind'], code?: string) => {
      setToasts((cur) => [...cur, { id: Date.now() + Math.random(), msg, kind, code }]);
    },
    [],
  );
  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  async function refresh() {
    try {
      const r = await fetch('/api/vales', { cache: 'no-store' });
      if (!r.ok) return;
      const j = (await r.json()) as { vales: Vale[] };
      setVales(j.vales);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (detail) {
      const fresh = vales.find((v) => v.id === detail.id);
      if (fresh && fresh !== detail) setDetail(fresh);
    }
  }, [vales, detail]);

  useEffect(() => {
    document.body.style.overflow = detail ? 'hidden' : '';
  }, [detail]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && detail) setDetail(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail]);

  const handleCreated = useCallback(
    (vale: Vale, mode: PrintMode) => {
      setVales((cur) => [vale, ...cur]);
      setPrint({ data: vale, mode });
      pushToast('Vale criado e enviado para impressão', 'success', vale.id);
    },
    [pushToast],
  );

  async function handleAbater(id: string, valor: number, obs: string) {
    try {
      const r = await fetch(`/api/vales/${id}/abater`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ valor, obs }),
      });
      const j = (await r.json()) as { vale?: Vale; error?: string };
      if (!r.ok || !j.vale) throw new Error(j.error || 'Falha ao abater.');
      setVales((cur) => cur.map((v) => (v.id === j.vale!.id ? j.vale! : v)));
      setDetail(j.vale);
      pushToast(`Abatido. Saldo: R$ ${j.vale.saldo.toFixed(2).replace('.', ',')}`, 'success');
    } catch (e) {
      pushToast((e as Error).message, 'error');
    }
  }

  function openDetail(id: string) {
    const v = vales.find((x) => x.id === id);
    if (v) setDetail(v);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <div className="app-shell max-w-[1180px] mx-auto px-6 py-8 pb-16">
      <header className="flex items-baseline justify-between flex-wrap gap-3 pb-4">
        <div>
          <div className="font-display text-3xl text-lulu-purple leading-none">
            Lulu Arteira
          </div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-lulu-magenta mt-1">
            Brechó Infantil
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-ink-soft tracking-wide">Sistema de vales 🩷</span>
          <button
            onClick={logout}
            className="text-xs font-bold uppercase tracking-wider text-ink-soft hover:text-lulu-magenta transition px-3 py-1.5 rounded-full border-2 border-line hover:border-lulu-magenta"
          >
            Sair
          </button>
        </div>
      </header>

      <nav className="flex border-b-2 border-line mb-7">
        <TabBtn active={view === 'nova'} onClick={() => setView('nova')}>
          Nova venda
        </TabBtn>
        <TabBtn active={view === 'vales'} onClick={() => { setView('vales'); refresh(); }}>
          Consultar vales
          <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-lulu-purple-soft text-lulu-purple">
            {vales.length}
          </span>
        </TabBtn>
      </nav>

      {view === 'nova' && (
        <NovaVendaForm
          onCreated={handleCreated}
          onError={(m) => pushToast(m, 'error')}
        />
      )}

      {view === 'vales' && <ValesList vales={vales} onOpen={openDetail} />}

      <ValeDetail
        vale={detail}
        onClose={() => setDetail(null)}
        onAbater={handleAbater}
        onReprint={(v) => setPrint({ data: v, mode: 'ambas' })}
      />

      <PrintArea
        data={print?.data ?? null}
        mode={print?.mode ?? null}
        onAfterPrint={() => setPrint(null)}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-0 mr-7 py-3 font-display font-bold text-sm border-b-[3px] transition ${
        active
          ? 'text-lulu-magenta border-lulu-magenta'
          : 'text-ink-soft border-transparent hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
