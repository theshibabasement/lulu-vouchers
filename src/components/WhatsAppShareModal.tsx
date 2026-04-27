'use client';

import { useState, useEffect } from 'react';
import { formatBRL, maskWhatsappInput, whatsappLink } from '@/lib/format';
import type { Vale } from '@/lib/types';

interface Props {
  vale: Vale | null;
  portalBase: string;
  onClose: () => void;
}

export function WhatsAppShareModal({ vale, portalBase, onClose }: Props) {
  const [whatsapp, setWhatsapp] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (vale) {
      // não temos whatsapp direto no Vale — buscar da api do cliente se tiver clienteId
      if (vale.clienteId) {
        fetch(`/api/clientes/${vale.clienteId}`)
          .then((r) => r.json())
          .then((j: { cliente?: { whatsapp?: string | null } }) => {
            if (j.cliente?.whatsapp) setWhatsapp(j.cliente.whatsapp);
          })
          .catch(() => {});
      }
    } else {
      setWhatsapp('');
      setEditing(false);
    }
  }, [vale]);

  if (!vale) return null;

  const url = vale.portalToken
    ? `${portalBase}/cliente/${encodeURIComponent(vale.portalToken)}`
    : `${portalBase}/cliente`;
  const firstName = vale.nome.split(' ')[0];
  const text = `Oi ${firstName}! Aqui é a Lulu Arteira 🩷\nTeu vale tá pronto: ${formatBRL(vale.valorOriginal)} em crédito.\n\nConfere o saldo e histórico aqui:\n${url}`;
  const wa = whatsapp.trim() ? whatsappLink(whatsapp.trim()) : null;
  const fullLink = wa ? `${wa}?text=${encodeURIComponent(text)}` : null;

  function copy() {
    navigator.clipboard.writeText(`${text}\n`).catch(() => {});
  }

  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur z-[150] grid place-items-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-lg max-w-md w-full p-6 border-[3px] border-ink shadow-sticker-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="text-3xl mb-1">🩷</div>
          <h3 className="font-display text-2xl text-lulu-purple">
            Vale impresso!
          </h3>
          <p className="text-sm text-ink-soft mt-1">
            Quer mandar o link pelo WhatsApp pra <b>{firstName}</b>?
          </p>
        </div>

        {!editing && whatsapp && !whatsapp.replace(/\D/g, '') && (
          // edge — mostra como editar
          null
        )}

        <div className="bg-paper-tint rounded-md p-3 border border-line text-xs text-ink-soft mb-4 whitespace-pre-line max-h-40 overflow-y-auto">
          {text}
        </div>

        {editing || !whatsapp.replace(/\D/g, '') ? (
          <div className="mb-4">
            <label className="lulu-label">WhatsApp do cliente</label>
            <input
              type="tel"
              inputMode="tel"
              autoFocus={editing}
              value={whatsapp}
              onChange={(e) => setWhatsapp(maskWhatsappInput(e.target.value))}
              placeholder="(54) 99999-9999"
              className="lulu-input"
            />
          </div>
        ) : (
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-ink-soft">
              Pra: <b className="text-ink">{whatsapp}</b>
            </span>
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-bold text-lulu-magenta hover:underline"
            >
              alterar
            </button>
          </div>
        )}

        <div className="space-y-2">
          {fullLink ? (
            <a
              href={fullLink}
              target="_blank"
              rel="noreferrer"
              onClick={() => setTimeout(onClose, 300)}
              className="lulu-btn-primary w-full text-center bg-lulu-mint text-ink"
            >
              Abrir WhatsApp
            </a>
          ) : (
            <button
              disabled
              className="lulu-btn-primary w-full disabled:opacity-50"
            >
              Informa um WhatsApp válido
            </button>
          )}

          <button onClick={copy} className="lulu-btn-secondary w-full">
            Copiar mensagem
          </button>
          <button onClick={onClose} className="text-sm font-bold text-ink-mute hover:text-ink py-2 w-full">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
