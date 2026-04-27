'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { formatBRL, formatLongDate } from '@/lib/format';

export interface ReceiptData {
  id: string;
  nome: string;
  cpf: string;
  valorOriginal: number;
  criadoEm?: string;
  portalToken?: string | null;
}

interface Props {
  data: ReceiptData;
  via: 'cliente' | 'loja';
  /** URL pública base do portal — usada pra montar o QR. */
  portalBase?: string;
  /** Tamanhos pra ajustar quando renderizar pra impressão grande vs preview. */
  barcodeOpts?: { width?: number; height?: number };
  qrSize?: number;
}

export function Receipt({ data, via, portalBase, barcodeOpts, qrSize }: Props) {
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Barcode CODE128 — pra leitor da loja (sempre na via cliente)
  useEffect(() => {
    if (via !== 'cliente' || !barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, data.id || 'LB0000000000', {
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

  // QR Code — link pro portal cliente
  useEffect(() => {
    if (via !== 'cliente' || !qrCanvasRef.current) return;
    const url = buildPortalUrl(portalBase, data.portalToken);
    if (!url) return;
    QRCode.toCanvas(qrCanvasRef.current, url, {
      width: qrSize ?? 140,
      margin: 1,
      color: { dark: '#000', light: '#fff' },
      errorCorrectionLevel: 'M',
    }).catch(() => {});
  }, [data.portalToken, via, qrSize, portalBase]);

  const nome = data.nome || '_______________________________';
  const cpf = data.cpf || '_______________';
  const valor = data.valorOriginal > 0 ? formatBRL(data.valorOriginal) : '_______________';
  const id = data.id || 'LB••••••••••';
  const dateStr = formatLongDate(data.criadoEm);
  const portalUrl = buildPortalUrl(portalBase, data.portalToken);

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

      {via === 'loja' && (
        <div className="sign">
          <div className="line"></div>
          Assinatura do cliente
        </div>
      )}

      {via === 'cliente' && (
        <>
          <hr className="divider" />
          <div className="codes">
            {portalUrl && (
              <div className="qr-block">
                <canvas ref={qrCanvasRef} className="qr-canvas"></canvas>
                <div className="qr-caption">Escaneia pra ver teu vale</div>
              </div>
            )}
            <div className="barcode-block">
              <svg ref={barcodeRef} className="barcode-svg"></svg>
              <div className="code-label">Vale: {id}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function buildPortalUrl(base: string | undefined, token: string | null | undefined): string | null {
  if (!token) return null;
  const root = (base || '').replace(/\/$/, '');
  return `${root}/cliente/${encodeURIComponent(token)}`;
}
