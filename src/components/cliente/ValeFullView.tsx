'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { formatBRL, formatDateTime } from '@/lib/format';
import type { Vale } from '@/lib/types';

interface Props {
  vale: Vale;
  portalBase: string;
  onBack: () => void;
}

export function ValeFullView({ vale, portalBase, onBack }: Props) {
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const qrRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, vale.id, {
          format: 'CODE128',
          width: 2.4,
          height: 80,
          margin: 0,
          background: '#fff',
          lineColor: '#000',
          displayValue: true,
          fontSize: 18,
          font: 'JetBrains Mono',
        });
      } catch {
        /* ignore */
      }
    }
    if (qrRef.current && vale.portalToken) {
      const url = `${portalBase}/cliente/${encodeURIComponent(vale.portalToken)}`;
      QRCode.toCanvas(qrRef.current, url, {
        width: 220,
        margin: 1,
        color: { dark: '#000', light: '#fff' },
        errorCorrectionLevel: 'M',
      }).catch(() => {});
    }
  }, [vale.id, vale.portalToken, portalBase]);

  const used = vale.valorOriginal - vale.saldo;
  const isUsed = vale.saldo === 0;

  return (
    <main className="min-h-screen bg-paper-sparkle pb-24">
      <header className="bg-paper border-b-2 border-line sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-sm font-bold uppercase tracking-wider text-ink-soft hover:text-lulu-magenta transition px-3 py-1.5 rounded-full border-2 border-line"
          >
            ← Voltar
          </button>
          <div className="font-display text-lg text-lulu-purple flex-1 truncate">
            Vale {vale.id}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <div
          className={`rounded-xl p-6 text-white shadow-lg ${
            isUsed
              ? 'bg-gradient-to-br from-ink to-ink-soft'
              : 'bg-gradient-to-br from-lulu-magenta to-lulu-purple'
          }`}
        >
          <div className="text-xs uppercase tracking-[0.18em] opacity-80">
            {isUsed ? 'Vale esgotado' : 'Saldo disponível'}
          </div>
          <div className="font-display text-5xl font-extrabold my-2">
            {formatBRL(vale.saldo)}
          </div>
          <div className="text-sm opacity-90 flex justify-between">
            <span>Original: {formatBRL(vale.valorOriginal)}</span>
            <span>Usado: {formatBRL(used)}</span>
          </div>
        </div>

        <section className="bg-paper rounded-lg p-5 border-2 border-line">
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-ink-soft mb-3">
            Mostra na loja ou informa pelo WhatsApp
          </h3>
          <div className="bg-white p-4 rounded-md border-2 border-line text-center">
            <svg ref={barcodeRef} className="mx-auto max-w-full h-auto"></svg>
          </div>
        </section>

        {vale.portalToken && (
          <section className="bg-paper rounded-lg p-5 border-2 border-line">
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-ink-soft mb-3">
              Compartilhar acesso
            </h3>
            <div className="bg-white p-4 rounded-md border-2 border-line text-center">
              <canvas ref={qrRef} className="mx-auto max-w-full h-auto"></canvas>
            </div>
            <p className="text-xs text-ink-soft mt-3 text-center">
              Esse QR abre todos os teus vales — guarda direitinho.
            </p>
          </section>
        )}

        <section className="bg-paper rounded-lg p-5 border-2 border-line">
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-ink-soft mb-3">
            Histórico
          </h3>
          {vale.transacoes.length === 0 ? (
            <p className="text-sm text-ink-soft">Sem movimentações.</p>
          ) : (
            <ul className="divide-y divide-line">
              {[...vale.transacoes].reverse().map((t, i) => (
                <li key={i} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-ink">
                      {t.tipo === 'criacao' ? 'Emissão' : 'Abatimento'}
                    </div>
                    <div className="text-xs text-ink-soft mt-0.5">
                      {formatDateTime(t.data)}
                    </div>
                    {t.obs && (
                      <div className="text-xs text-ink-mute mt-1 italic">
                        {t.obs}
                      </div>
                    )}
                  </div>
                  <div
                    className={`font-mono font-bold text-sm whitespace-nowrap ${
                      t.tipo === 'criacao' ? 'text-lulu-purple' : 'text-lulu-heart-red'
                    }`}
                  >
                    {t.tipo === 'criacao' ? '+' : '−'} {formatBRL(Math.abs(t.valor))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
