'use client';

import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { formatBRL, formatCPF, formatDateTime, maskBRLInput, parseBRL } from '@/lib/format';
import type { Vale } from '@/lib/types';

interface Props {
  vale: Vale | null;
  onClose: () => void;
  onAbater: (id: string, valor: number, obs: string) => Promise<void>;
  onReprint: (vale: Vale) => void;
  onDelete: (id: string) => Promise<void>;
}

export function ValeDetail({ vale, onClose, onAbater, onReprint, onDelete }: Props) {
  const [valor, setValor] = useState('');
  const [obs, setObs] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!vale || !svgRef.current) return;
    try {
      JsBarcode(svgRef.current, vale.id, {
        format: 'CODE128',
        width: 2.2,
        height: 70,
        margin: 0,
        background: '#fff',
        lineColor: '#000',
        displayValue: true,
        fontSize: 16,
        font: 'JetBrains Mono',
      });
    } catch {
      /* ignore */
    }
  }, [vale]);

  useEffect(() => {
    if (vale) {
      setValor('');
      setObs('');
      setConfirmDelete(false);
    }
  }, [vale?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!vale) return null;

  const used = vale.valorOriginal - vale.saldo;
  const isUsed = vale.saldo === 0;
  const isDeleted = !!vale.deletadoEm;

  async function doDelete() {
    if (!vale || deleting) return;
    setDeleting(true);
    try {
      await onDelete(vale.id);
    } finally {
      setDeleting(false);
    }
  }

  async function doAbater() {
    if (busy || !vale) return;
    const v = parseBRL(valor);
    if (!(v > 0)) return;
    setBusy(true);
    try {
      await onAbater(vale.id, v, obs.trim());
      setValor('');
      setObs('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="lulu-overlay fixed inset-0 bg-ink/40 backdrop-blur z-[100]" onClick={onClose} />
      <aside className="lulu-slide-over fixed top-0 right-0 bottom-0 w-full sm:w-[480px] max-w-[100vw] bg-paper z-[101] shadow-2xl overflow-y-auto border-l-2 border-line">
        <div className="sticky top-0 bg-paper flex items-center justify-between px-6 py-4 border-b-2 border-line z-10">
          <h3 className="font-display text-xl text-lulu-purple">Vale {vale.id}</h3>
          <button
            onClick={onClose}
            className="text-2xl text-ink-mute hover:text-ink hover:bg-paper-tint w-9 h-9 rounded-md transition"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {isDeleted && (
            <div className="rounded-md bg-lulu-cheek-pink/40 border-2 border-lulu-heart-red px-3 py-2 text-sm text-ink mb-4 flex items-center gap-2">
              <span className="font-bold">Vale excluído.</span>
              <span className="text-xs opacity-80">
                Soft delete em {formatDateTime(vale.deletadoEm!)}.
              </span>
            </div>
          )}

          <div
            className={`rounded-lg p-5 mb-5 text-white ${
              isDeleted
                ? 'bg-gradient-to-br from-ink-mute to-ink-soft opacity-70'
                : isUsed
                ? 'bg-gradient-to-br from-ink to-ink-soft'
                : 'bg-gradient-to-br from-lulu-magenta to-lulu-purple'
            }`}
          >
            <div className="text-xs uppercase tracking-[0.16em] opacity-80">
              {isDeleted ? 'Vale excluído' : isUsed ? 'Vale esgotado' : 'Saldo disponível'}
            </div>
            <div className="font-display text-4xl font-extrabold my-2">
              {formatBRL(vale.saldo)}
            </div>
            <div className="text-xs opacity-85 flex justify-between">
              <span>Original: {formatBRL(vale.valorOriginal)}</span>
              <span>Usado: {formatBRL(used)}</span>
            </div>
          </div>

          <Section title="Cliente">
            <Row k="Nome" v={vale.nome} />
            <Row k="CPF" v={formatCPF(vale.cpf)} />
            <Row k="Código" v={<span className="font-mono text-xs">{vale.id}</span>} />
            <Row k="Criado em" v={formatDateTime(vale.criadoEm)} />
            <Row
              k="Status"
              v={
                <span
                  className={`lulu-pill ${
                    isUsed
                      ? 'bg-lulu-cheek-pink text-lulu-heart-red'
                      : 'bg-lulu-purple-soft text-lulu-purple'
                  }`}
                >
                  {isUsed ? 'Esgotado' : 'Ativo'}
                </span>
              }
            />
          </Section>

          <Section title="Código de barras">
            <div className="bg-white p-4 border-2 border-line rounded-md mb-3 flex justify-center items-center overflow-hidden">
              <svg ref={svgRef} className="block max-w-full h-auto"></svg>
            </div>
            <button onClick={() => onReprint(vale)} className="lulu-btn-secondary w-full">
              Reimprimir guias
            </button>
          </Section>

          {!isUsed && !isDeleted && (
            <Section title="Abater do saldo">
              <div className="space-y-3">
                <div>
                  <label className="lulu-label">Valor a abater</label>
                  <input
                    inputMode="numeric"
                    value={valor}
                    onChange={(e) => setValor(maskBRLInput(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && doAbater()}
                    placeholder="R$ 0,00"
                    className="lulu-input"
                  />
                </div>
                <div>
                  <label className="lulu-label">Observação (opcional)</label>
                  <input
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && doAbater()}
                    placeholder="Ex: vestido azul tam. 6"
                    className="lulu-input"
                  />
                </div>
                <button
                  onClick={doAbater}
                  disabled={busy}
                  className="lulu-btn-primary w-full disabled:opacity-60"
                >
                  {busy ? 'Abatendo…' : 'Abater do vale'}
                </button>
              </div>
            </Section>
          )}

          {!isDeleted && (
            <Section title="Excluir vale">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full px-4 py-3 rounded-md font-bold text-sm border-2 border-lulu-heart-red text-lulu-heart-red bg-paper hover:bg-lulu-cheek-pink/20 transition"
                >
                  Excluir este vale
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-ink-soft">
                    O vale será marcado como excluído e some das listagens.
                    Pode ser restaurado depois pelo filtro <b>Excluídos</b>.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="lulu-btn-secondary"
                      disabled={deleting}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={doDelete}
                      disabled={deleting}
                      className="px-4 py-3 rounded-md font-display font-bold text-base border-[3px] border-ink shadow-sticker bg-lulu-heart-red text-white active:translate-y-[2px] active:shadow-none transition disabled:opacity-60"
                    >
                      {deleting ? 'Excluindo…' : 'Confirmar exclusão'}
                    </button>
                  </div>
                </div>
              )}
            </Section>
          )}

          <Section title="Histórico">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <Th>Data</Th>
                  <Th>Tipo</Th>
                  <Th>Valor</Th>
                  <Th>Obs.</Th>
                </tr>
              </thead>
              <tbody>
                {[...vale.transacoes].reverse().map((t, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-2 px-2">{formatDateTime(t.data)}</td>
                    <td className="py-2 px-2">
                      {t.tipo === 'criacao' ? 'Emissão' : 'Abatimento'}
                    </td>
                    <td
                      className={`py-2 px-2 font-mono font-bold ${
                        t.tipo === 'criacao' ? 'text-lulu-purple' : 'text-lulu-heart-red'
                      }`}
                    >
                      {t.tipo === 'criacao' ? '+' : '−'} {formatBRL(Math.abs(t.valor))}
                    </td>
                    <td className="py-2 px-2 text-xs text-ink-soft">{t.obs || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-ink-soft mb-3">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-line text-sm last:border-b-0">
      <span className="text-ink-soft">{k}</span>
      <span className="text-ink">{v}</span>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-ink-soft border-b-2 border-line">
      {children}
    </th>
  );
}
