'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { formatBRL, formatLongDate } from '@/lib/format';

export interface ReceiptData {
  id: string;
  nome: string;
  cpf: string;
  valorOriginal: number;
  criadoEm?: string;
}

interface Props {
  data: ReceiptData;
  via: 'cliente' | 'loja';
  barcodeOpts?: { width?: number; height?: number };
}

export function Receipt({ data, via, barcodeOpts }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (via !== 'cliente' || !svgRef.current) return;
    try {
      JsBarcode(svgRef.current, data.id || 'LB0000000000', {
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
  }, [data.id, via, barcodeOpts?.width, barcodeOpts?.height]);

  const nome = data.nome || '_______________________________';
  const cpf = data.cpf || '_______________';
  const valor = data.valorOriginal > 0 ? formatBRL(data.valorOriginal) : '_______________';
  const id = data.id || 'LB••••••••••';
  const dateStr = formatLongDate(data.criadoEm);

  return (
    <div className="receipt">
      <div className="brand">Lulu Arteira</div>
      <div className="brand-sub">Brechó Infantil</div>
      <hr className="divider" />
      <div className="via">— {via === 'cliente' ? 'Via do cliente' : 'Via da loja'} —</div>
      <hr className="divider" />
      <div className="field-line"><span className="lbl">Eu:</span> {nome}</div>
      <div className="field-line"><span className="lbl">CPF:</span> {cpf}</div>
      <hr className="divider" />
      <p>
        Declaro que por ter vendido produtos seminovos para Lulu Arteira, recebendo a
        quantia de <b>{valor}</b> em crédito para compras na loja.
      </p>
      <p>
        Declaro que os itens vendidos à Lulu Arteira são de minha propriedade e estou
        ciente que serão por ela a comercialização, sem que eu tenha participação no
        negócio.
      </p>
      <p>
        Declaro que tive tempo hábil para avaliar o negócio que fiz, tomei minha decisão
        de forma absolutamente consciente, não podendo dela legalmente me arrepender.
      </p>
      <div className="date">{dateStr}</div>
      <div className="sign">
        <div className="line"></div>
        Assinatura do cliente
      </div>
      {via === 'cliente' && (
        <div className="barcode">
          <svg ref={svgRef}></svg>
          <div className="code-label">Vale: {id}</div>
        </div>
      )}
      <hr className="divider" />
      <div className="footer">Lulu Arteira · Brechó Infantil</div>
    </div>
  );
}
