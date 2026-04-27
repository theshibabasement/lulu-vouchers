'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Receipt, type ReceiptData } from './Receipt';

export type PrintMode = 'ambas' | 'cliente' | 'loja';

interface Props {
  /** Único vale ou lote. Lote sempre imprime "ambas" vias por vale. */
  data: ReceiptData | null;
  lote?: ReceiptData[];
  mode: PrintMode | null;
  portalBase: string;
  onAfterPrint: () => void;
}

export function PrintArea({ data, lote, mode, portalBase, onAfterPrint }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const items = lote && lote.length > 0 ? lote : data ? [data] : [];

  useEffect(() => {
    if (items.length === 0 || !mode) return;
    if (mode === 'cliente') document.body.classList.add('print-only-cliente');
    if (mode === 'loja') document.body.classList.add('print-only-loja');

    const t = setTimeout(() => window.print(), 250);

    const cleanup = () => {
      document.body.classList.remove('print-only-cliente', 'print-only-loja');
      onAfterPrint();
    };
    window.addEventListener('afterprint', cleanup, { once: true });

    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', cleanup);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, mode, onAfterPrint]);

  if (!mounted || items.length === 0) return null;

  return createPortal(
    <div className="print-area" ref={ref}>
      {items.map((d) => (
        <div key={d.id}>
          <div className="print-receipt receipt" data-via="cliente">
            <Receipt
              data={d}
              via="cliente"
              portalBase={portalBase}
              barcodeOpts={{ width: 2, height: 55 }}
              qrSize={180}
            />
          </div>
          <div className="print-receipt receipt" data-via="loja">
            <Receipt data={d} via="loja" portalBase={portalBase} />
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
