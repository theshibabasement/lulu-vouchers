'use client';

import { useEffect } from 'react';

export interface ToastMsg {
  id: number;
  msg: string;
  kind?: 'success' | 'error';
  code?: string;
}

interface Props {
  toasts: ToastMsg[];
  onDismiss: (id: number) => void;
}

export function ToastStack({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMsg; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bg =
    toast.kind === 'success'
      ? 'bg-lulu-purple text-white'
      : toast.kind === 'error'
      ? 'bg-lulu-heart-red text-white'
      : 'bg-ink text-white';

  return (
    <div
      className={`lulu-toast px-5 py-3 rounded-md font-semibold text-sm shadow-lg border-2 border-ink flex items-center gap-3 ${bg}`}
    >
      <span>{toast.msg}</span>
      {toast.code && (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/20">
          {toast.code}
        </span>
      )}
    </div>
  );
}
