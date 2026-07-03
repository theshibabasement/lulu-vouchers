'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GuiaVenda, type GuiaVendaData } from './GuiaVenda';

interface Props {
  /** Guia a imprimir; null = nada na fila. */
  data: GuiaVendaData | null;
  onAfterPrint: () => void;
}

/**
 * Imprime UMA guia por pedido (pra colar na embalagem). Reaproveita as classes
 * `.print-area`/`.print-receipt` do CSS de impressão térmica 80mm dos vales.
 */
export function PrintAreaVenda({ data, onAfterPrint }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => window.print(), 250);
    const cleanup = () => onAfterPrint();
    window.addEventListener('afterprint', cleanup, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', cleanup);
    };
  }, [data, onAfterPrint]);

  if (!mounted || !data) return null;

  return createPortal(
    <div className="print-area">
      <div className="print-receipt receipt">
        <GuiaVenda data={data} barcodeOpts={{ width: 2, height: 55 }} />
      </div>
    </div>,
    document.body,
  );
}
