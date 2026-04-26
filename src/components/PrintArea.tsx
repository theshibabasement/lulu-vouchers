'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Receipt, type ReceiptData } from './Receipt';

interface Props {
  data: ReceiptData | null;
  mode: 'ambas' | 'cliente' | 'loja' | null;
  onAfterPrint: () => void;
}

export function PrintArea({ data, mode, onAfterPrint }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!data || !mode) return;
    if (mode === 'cliente') document.body.classList.add('print-only-cliente');
    if (mode === 'loja') document.body.classList.add('print-only-loja');

    const t = setTimeout(() => {
      if (ref.current) {
        ref.current.querySelectorAll<SVGSVGElement>('svg.print-barcode').forEach((svg) => {
          try {
            JsBarcode(svg, data.id, {
              format: 'CODE128',
              width: 2,
              height: 55,
              margin: 0,
              background: '#fff',
              lineColor: '#000',
              displayValue: false,
            });
          } catch {
            /* ignore */
          }
        });
      }
      window.print();
    }, 60);

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

  if (!data) return null;

  return (
    <div className="print-area" ref={ref}>
      <div className="print-receipt receipt" data-via="cliente">
        <Receipt data={data} via="cliente" barcodeOpts={{ width: 2, height: 55 }} />
      </div>
      <div className="print-receipt receipt" data-via="loja">
        <Receipt data={data} via="loja" />
      </div>
    </div>
  );
}
