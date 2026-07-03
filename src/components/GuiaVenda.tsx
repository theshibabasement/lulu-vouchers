'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { formatBRL, formatLongDate } from '@/lib/format';

export interface GuiaVendaData {
  codigo: number;
  nome: string;
  cpf?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  valor: number;
  criadoEm?: string;
  prazoRetirada?: string;
  observacoes?: string | null;
}

interface Props {
  data: GuiaVendaData;
  /** Tamanho do código de barras — maior na impressão, menor no preview. */
  barcodeOpts?: { width?: number; height?: number };
}

/** Formata o código como "#1042" (com zero-pad mínimo de 4 dígitos). */
export function formatCodigo(codigo: number): string {
  return '#' + String(codigo).padStart(4, '0');
}

function shortDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function GuiaVenda({ data, barcodeOpts }: Props) {
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, String(data.codigo), {
        format: 'CODE128',
        width: barcodeOpts?.width ?? 1.6,
        height: barcodeOpts?.height ?? 44,
        margin: 0,
        background: '#fff',
        lineColor: '#000',
        displayValue: false,
      });
    } catch {
      /* ignore */
    }
  }, [data.codigo, barcodeOpts?.width, barcodeOpts?.height]);

  const instagram = data.instagram ? '@' + data.instagram : null;
  const valor = data.valor > 0 ? formatBRL(data.valor) : '—';

  return (
    <div className="receipt">
      <div className="brand">Lulu Arteira</div>
      <div className="brand-sub">Brechó Infantil</div>
      <hr className="divider" />
      <div className="via">— Pedido online —</div>

      <div className="guia-codigo">{formatCodigo(data.codigo)}</div>
      <div className="barcode-block">
        <svg ref={barcodeRef} className="barcode-svg"></svg>
      </div>

      <hr className="divider" />
      <div className="field-line">
        <span className="lbl">Cliente:</span> {data.nome || '—'}
      </div>
      {instagram && (
        <div className="field-line">
          <span className="lbl">Instagram:</span> {instagram}
        </div>
      )}
      {data.whatsapp && (
        <div className="field-line">
          <span className="lbl">WhatsApp:</span> {data.whatsapp}
        </div>
      )}
      <div className="field-line">
        <span className="lbl">Valor pago:</span> <b>{valor}</b>
      </div>
      {data.observacoes && (
        <div className="field-line">
          <span className="lbl">Obs.:</span> {data.observacoes}
        </div>
      )}

      <hr className="divider" />
      <div className="guia-prazo">
        Retirar até <b>{shortDate(data.prazoRetirada)}</b>
      </div>
      <div className="date">Pedido em {formatLongDate(data.criadoEm)}</div>
    </div>
  );
}
