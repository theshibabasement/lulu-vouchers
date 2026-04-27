'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Receipt, type ReceiptData } from './Receipt';

interface Props {
  data: ReceiptData | null;
  mode: 'ambas' | 'cliente' | 'loja' | null;
  portalBase: string;
  onAfterPrint: () => void;
}

export function PrintArea({ data, mode, portalBase, onAfterPrint }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  // Garante que document.body existe (SSR-safe)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!data || !mode) return;
    if (mode === 'cliente') document.body.classList.add('print-only-cliente');
    if (mode === 'loja') document.body.classList.add('print-only-loja');

    // Espera mais — QR Code/JsBarcode são async (canvas e SVG ops)
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
  }, [data, mode, onAfterPrint]);

  if (!mounted || !data) return null;

  // Portal pra document.body — print-area precisa ser filho DIRETO do body
  // pra escapar do `body > *:not(.print-area) { display: none }` no print.
  return createPortal(
    <div className="print-area" ref={ref}>
      <div className="print-receipt receipt" data-via="cliente">
        <Receipt
          data={data}
          via="cliente"
          portalBase={portalBase}
          barcodeOpts={{ width: 2, height: 55 }}
          qrSize={180}
        />
      </div>
      <div className="print-receipt receipt" data-via="loja">
        <Receipt data={data} via="loja" portalBase={portalBase} />
      </div>
    </div>,
    document.body,
  );
}
