'use client';

import { useState, useEffect } from 'react';
import { formatBRL, maskWhatsappInput, validateWhatsappBR } from '@/lib/format';
import { formatCodigo } from './GuiaVenda';
import type { Venda } from '@/lib/types';

interface Props {
  venda: Venda | null;
  portalBase: string;
  onClose: () => void;
  /** Notifica o pai que o whatsapp do cliente foi salvo (refetch). */
  onWhatsappSaved?: () => void;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Modal pra avisar a cliente pelo WhatsApp que o pedido está pronto pra retirada. */
export function AvisarRetiradaModal({ venda, portalBase, onClose, onWhatsappSaved }: Props) {
  const [whatsapp, setWhatsapp] = useState('');
  const [originalWhatsapp, setOriginalWhatsapp] = useState('');
  const [editing, setEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Pré-carrega o whatsapp: primeiro do snapshot da venda; se vazio e houver
  // cliente linkado, busca o do cadastro (a venda pode não ter capturado).
  useEffect(() => {
    if (!venda) {
      setWhatsapp('');
      setOriginalWhatsapp('');
      setEditing(true);
      setErr(null);
      return;
    }
    const snap = venda.whatsapp ?? '';
    setWhatsapp(snap);
    setOriginalWhatsapp(snap);
    setEditing(!snap);
    if (!snap && venda.clienteId) {
      fetch(`/api/clientes/${venda.clienteId}`)
        .then((r) => r.json())
        .then((j: { cliente?: { whatsapp?: string | null } }) => {
          const wa = j.cliente?.whatsapp ?? '';
          if (wa) {
            setWhatsapp(wa);
            setOriginalWhatsapp(wa);
            setEditing(false);
          }
        })
        .catch(() => {});
    }
  }, [venda?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!venda) return null;

  const firstName = venda.nome.split(/\s+/)[0] || venda.nome;
  const url = venda.portalToken
    ? `${portalBase}/cliente/${encodeURIComponent(venda.portalToken)}`
    : null;
  // Sem emojis na mensagem — Desktop antigo renderiza mal. Acentos passam bem.
  const itens = venda.observacoes?.trim();
  const text =
    `Oi ${firstName}! Teu pedido ${formatCodigo(venda.codigo)} da Lulu Arteira ` +
    `já está pronto pra retirada!\n\n` +
    (itens ? `Itens: ${itens}\n` : '') +
    `Valor: ${formatBRL(venda.valor)}\n` +
    `Retirar até ${shortDate(venda.prazoRetirada)}\n` +
    (url ? `\nDetalhes do pedido:\n${url}` : '');

  const validation = whatsapp.trim() ? validateWhatsappBR(whatsapp) : null;
  const validE164 = validation?.valid ? validation.e164 : null;
  const fullLink = validE164 ? `https://wa.me/${validE164}?text=${encodeURIComponent(text)}` : null;

  function copy() {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  // Dispara save do whatsapp em background e deixa o browser abrir o wa.me.
  function onAbrirClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!fullLink || !venda) {
      e.preventDefault();
      return;
    }
    setErr(null);
    const changed = whatsapp.replace(/\D/g, '') !== originalWhatsapp.replace(/\D/g, '');
    if (changed && venda.clienteId) {
      setSaving(true);
      fetch(`/api/clientes/${venda.clienteId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ whatsapp: validation?.formatted }),
      })
        .then(async (r) => {
          if (!r.ok) {
            const j = (await r.json().catch(() => ({}))) as { error?: string };
            throw new Error(j.error || 'Falha ao salvar WhatsApp.');
          }
          setOriginalWhatsapp(validation?.formatted ?? whatsapp);
          onWhatsappSaved?.();
        })
        .catch((err) => console.error('[avisar-retirada] save background falhou:', err))
        .finally(() => setSaving(false));
    }
    setTimeout(onClose, 300);
  }

  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur z-[150] grid place-items-center px-4 py-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-lg max-w-md w-full p-6 border-[3px] border-ink shadow-sticker-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="text-3xl mb-1">📦</div>
          <h3 className="font-display text-2xl text-lulu-purple">Avisar retirada</h3>
          <p className="text-sm text-ink-soft mt-1">
            Manda o aviso pelo WhatsApp pra <b>{firstName}</b> — pedido{' '}
            <b>{formatCodigo(venda.codigo)}</b>.
          </p>
        </div>

        <div className="bg-paper-tint rounded-md p-3 border border-line text-xs text-ink-soft mb-4 whitespace-pre-line max-h-40 overflow-y-auto">
          {text}
        </div>

        {editing ? (
          <div className="mb-4">
            <label className="lulu-label">WhatsApp da cliente</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(maskWhatsappInput(e.target.value))}
              placeholder="(54) 99999-9999"
              className="lulu-input"
            />
            {whatsapp.trim() && validation && !validation.valid && (
              <p className="text-xs text-lulu-heart-red mt-1.5">{validation.error}</p>
            )}
            {originalWhatsapp && (
              <button
                type="button"
                onClick={() => {
                  setWhatsapp(originalWhatsapp);
                  setEditing(false);
                }}
                className="text-xs font-bold text-ink-mute hover:text-ink mt-2"
              >
                cancelar edição
              </button>
            )}
          </div>
        ) : (
          <div className="mb-4 flex items-center justify-between text-sm bg-paper-tint rounded-md px-3 py-2 border border-line">
            <span className="text-ink-soft">
              Pra: <b className="text-ink">{whatsapp}</b>
            </span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs font-bold text-lulu-magenta hover:underline"
            >
              alterar
            </button>
          </div>
        )}

        {err && (
          <div className="rounded-md bg-lulu-cheek-pink/40 border-2 border-lulu-heart-red px-3 py-2 text-sm text-ink mb-3">
            {err}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {fullLink ? (
            <a
              href={fullLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onAbrirClick}
              className="w-full px-5 py-3 rounded-md font-display font-bold text-base border-[3px] border-ink shadow-sticker bg-lulu-mint text-ink text-center active:translate-y-[2px] active:shadow-none transition"
            >
              {saving ? 'Salvando…' : 'Abrir WhatsApp'}
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="w-full px-5 py-3 rounded-md font-display font-bold text-base border-[3px] border-ink shadow-sticker bg-paper text-ink-mute opacity-60 cursor-not-allowed"
            >
              Informa um WhatsApp válido
            </button>
          )}

          <button
            type="button"
            onClick={copy}
            className="w-full px-5 py-2.5 rounded-md font-bold text-sm border-2 border-line bg-paper text-ink-soft hover:border-ink-mute hover:text-ink transition"
          >
            Copiar mensagem
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-sm font-bold text-ink-mute hover:text-ink py-2"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
