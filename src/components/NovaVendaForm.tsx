'use client';

import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { Receipt } from './Receipt';
import { isValidCPF, maskCPFInput, maskBRLInput, parseBRL } from '@/lib/format';
import type { Cliente, Vale } from '@/lib/types';

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
  const [cpfErr, setCpfErr] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [foundClient, setFoundClient] = useState<string | null>(null);
  const lastLookupRef = useRef<string>('');

  // Quando CPF tem 11 dígitos e é válido, busca cliente já cadastrado
  useEffect(() => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) {
      setCpfErr(null);
      setFoundClient(null);
      lastLookupRef.current = '';
      return;
    }
    if (!isValidCPF(digits)) {
      setCpfErr('CPF inválido — confere os dígitos.');
      setFoundClient(null);
      return;
    }
    setCpfErr(null);
    if (digits === lastLookupRef.current) return;
    lastLookupRef.current = digits;
    const ac = new AbortController();
    setLookingUp(true);
    fetch(`/api/clientes/by-cpf?cpf=${digits}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((j: { cliente?: Cliente | null }) => {
        if (j.cliente) {
          setFoundClient(j.cliente.nome);
          // Auto-preenche nome só se vazio (não sobrescreve digitação)
          if (!nome.trim()) setNome(j.cliente.nome);
        } else {
          setFoundClient(null);
        }
      })
      .catch(() => {})
      .finally(() => setLookingUp(false));
    return () => ac.abort();
  }, [cpf]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(mode: 'ambas' | 'cliente' | 'loja') {
    if (submitting) return;
    if (!nome.trim()) return onError('Informe o nome do cliente.');
    const cpfDigits = cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) return onError('CPF inválido.');
    if (!isValidCPF(cpfDigits)) return onError('CPF inválido — confere os dígitos.');
    const v = parseBRL(valor);
    if (!(v > 0)) return onError('Informe um valor válido.');

    setSubmitting(true);
    try {
      const r = await fetch('/api/vales', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), cpf: cpfDigits, valor: v }),
      });
      const j = (await r.json()) as { vale?: Vale; error?: string };
      if (!r.ok || !j.vale) throw new Error(j.error || 'Falha ao criar vale.');
      onCreated(j.vale, mode);
      setNome('');
      setCpf('');
      setValor('');
      setFoundClient(null);
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

  // Live preview data — token placeholder gera QR fictício pra ilustrar.
  // O token real vem do servidor após criar.
  const previewData = {
    id: 'LB' + '0'.repeat(10),
    nome: nome.trim(),
    cpf: cpf.trim(),
    valorOriginal: parseBRL(valor),
    criadoEm: new Date().toISOString(),
    portalToken: 'preview',
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      <section className="lulu-card p-7">
        <h2 className="font-display text-2xl text-lulu-magenta mb-1">Dados da troca</h2>
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
            <label className="lulu-label flex items-center justify-between">
              <span>CPF</span>
              {lookingUp && (
                <span className="text-[11px] font-normal normal-case tracking-normal text-ink-mute">
                  buscando…
                </span>
              )}
              {!lookingUp && foundClient && (
                <span className="text-[11px] font-normal normal-case tracking-normal text-lulu-purple">
                  ✓ cliente já cadastrado
                </span>
              )}
            </label>
            <input
              inputMode="numeric"
              value={cpf}
              onChange={(e) => setCpf(maskCPFInput(e.target.value))}
              onKeyDown={onKey}
              placeholder="000.000.000-00"
              maxLength={14}
              className={`lulu-input ${cpfErr ? 'border-lulu-heart-red focus:border-lulu-heart-red focus:ring-lulu-heart-red/15' : ''}`}
            />
            {cpfErr && (
              <p className="text-xs text-lulu-heart-red mt-1.5">{cpfErr}</p>
            )}
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
              Imprimir só via do cliente
            </button>
            <button
              onClick={() => submit('loja')}
              disabled={submitting}
              className="lulu-btn-secondary disabled:opacity-60"
            >
              Imprimir só via da loja
            </button>
          </div>
        </div>
      </section>

      <aside className="lg:sticky lg:top-6">
        <div className="lulu-card p-7">
          <h2 className="font-display text-2xl text-lulu-magenta mb-1">
            Pré-visualização
          </h2>
          <p className="text-sm text-ink-soft mb-5">
            Como a via do cliente vai sair na impressora.
          </p>
          <div className="bg-white max-w-[340px] mx-auto p-5 rounded shadow-md border-2 border-line">
            <Receipt
              data={previewData}
              via="cliente"
              portalBase={portalBase}
              barcodeOpts={{ width: 1.4, height: 36 }}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
