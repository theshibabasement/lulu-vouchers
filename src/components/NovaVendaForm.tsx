'use client';

import { useState, useEffect, type KeyboardEvent } from 'react';
import { Receipt } from './Receipt';
import { maskCPFInput, maskBRLInput, parseBRL } from '@/lib/format';
import type { Vale } from '@/lib/types';

interface Props {
  onCreated: (vale: Vale, mode: 'ambas' | 'cliente' | 'loja') => void;
  onError: (msg: string) => void;
  portalBase: string;
}

export function NovaVendaForm({ onCreated, onError, portalBase }: Props) {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [valor, setValor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(mode: 'ambas' | 'cliente' | 'loja') {
    if (submitting) return;
    if (!nome.trim()) return onError('Informe o nome do cliente.');
    if (cpf.replace(/\D/g, '').length !== 11) return onError('CPF inválido.');
    const v = parseBRL(valor);
    if (!(v > 0)) return onError('Informe um valor válido.');

    setSubmitting(true);
    try {
      const r = await fetch('/api/vales', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), cpf: cpf.trim(), valor: v }),
      });
      const j = (await r.json()) as { vale?: Vale; error?: string };
      if (!r.ok || !j.vale) throw new Error(j.error || 'Falha ao criar vale.');
      onCreated(j.vale, mode);
      setNome('');
      setCpf('');
      setValor('');
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit('ambas');
    }
  }

  // Live preview data — sem token (QR só aparece após criar)
  const previewData = {
    id: 'LB' + '0'.repeat(10),
    nome: nome.trim(),
    cpf: cpf.trim(),
    valorOriginal: parseBRL(valor),
    criadoEm: new Date().toISOString(),
    portalToken: null,
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      <section className="lulu-card p-7">
        <h2 className="font-display text-2xl text-lulu-magenta mb-1">Dados da venda</h2>
        <p className="text-sm text-ink-soft mb-5">
          Preencha os dados de quem está vendendo seus produtos seminovos. 🩷
        </p>

        <div className="space-y-4">
          <div>
            <label className="lulu-label">Nome completo</label>
            <input
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={onKey}
              placeholder="Nome do cliente"
              className="lulu-input"
            />
          </div>

          <div>
            <label className="lulu-label">CPF</label>
            <input
              inputMode="numeric"
              value={cpf}
              onChange={(e) => setCpf(maskCPFInput(e.target.value))}
              onKeyDown={onKey}
              placeholder="000.000.000-00"
              maxLength={14}
              className="lulu-input"
            />
          </div>

          <div>
            <label className="lulu-label">Valor em crédito</label>
            <input
              inputMode="numeric"
              value={valor}
              onChange={(e) => setValor(maskBRLInput(e.target.value))}
              onKeyDown={onKey}
              placeholder="R$ 0,00"
              className="lulu-input"
            />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <button
            onClick={() => submit('ambas')}
            disabled={submitting}
            className="lulu-btn-primary w-full disabled:opacity-60"
          >
            {submitting ? 'Salvando…' : 'Salvar e imprimir guias'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => submit('cliente')}
              disabled={submitting}
              className="lulu-btn-secondary disabled:opacity-60"
            >
              Salvar + só cliente
            </button>
            <button
              onClick={() => submit('loja')}
              disabled={submitting}
              className="lulu-btn-secondary disabled:opacity-60"
            >
              Salvar + só loja
            </button>
          </div>
        </div>

        <div className="mt-5 p-3 rounded-md bg-paper-tint border-l-4 border-lulu-cyan text-xs text-ink-soft leading-relaxed">
          <b className="text-ink">Recorte automático:</b> a MP-4200 TH só corta entre as
          vias se o driver do Windows estiver em <b>"Page end cut"</b> /{' '}
          <b>"Após cada página"</b>. Configure em{' '}
          <i>Painel de Controle → Impressoras → MP-4200 TH → Preferências</i>.
        </div>
      </section>

      <aside className="lg:sticky lg:top-6">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-ink-soft mb-3 flex items-center gap-2">
          Pré-visualização (via do cliente)
          <span className="flex-1 h-px bg-line"></span>
        </div>
        <div className="bg-white max-w-[340px] mx-auto p-5 rounded shadow-lg border-2 border-line">
          <Receipt
            data={previewData}
            via="cliente"
            portalBase={portalBase}
            barcodeOpts={{ width: 1.4, height: 36 }}
          />
        </div>
      </aside>
    </div>
  );
}
