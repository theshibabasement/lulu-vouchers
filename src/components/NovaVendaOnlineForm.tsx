'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { GuiaVenda } from './GuiaVenda';
import { formatBRL, isValidCPF, maskCPFInput, maskBRLInput, parseBRL } from '@/lib/format';
import { JANELA_RETIRADA_DIAS, type Cliente, type Venda } from '@/lib/types';

interface Props {
  onCreated: (venda: Venda) => void;
  onError: (msg: string) => void;
  recentes: Venda[];
  onOpenVenda: (id: number) => void;
  onVerTodas: () => void;
}

/** Tira @ e espaços do que a atendente digita no campo Instagram. */
function cleanHandle(raw: string): string {
  return raw.replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
}

export function NovaVendaOnlineForm({
  onCreated,
  onError,
  recentes,
  onOpenVenda,
  onVerTodas,
}: Props) {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [valor, setValor] = useState('');
  const [obs, setObs] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cpfErr, setCpfErr] = useState<string | null>(null);
  const [foundBy, setFoundBy] = useState<string | null>(null);
  const lastCpfRef = useRef<string>('');
  const lastIgRef = useRef<string>('');

  function aplicaCliente(cli: Cliente, via: string) {
    setFoundBy(`${cli.nome} — ${via}`);
    if (!nome.trim()) setNome(cli.nome);
    if (!cpf.trim() && cli.cpf) setCpf(maskCPFInput(cli.cpf));
    if (!instagram.trim() && cli.instagram) setInstagram(cli.instagram);
    if (!whatsapp.trim() && cli.whatsapp) setWhatsapp(cli.whatsapp);
  }

  // Busca cliente por CPF quando os 11 dígitos são válidos
  useEffect(() => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) {
      setCpfErr(null);
      return;
    }
    if (!isValidCPF(digits)) {
      setCpfErr('CPF inválido — confere os dígitos.');
      return;
    }
    setCpfErr(null);
    if (digits === lastCpfRef.current) return;
    lastCpfRef.current = digits;
    const ac = new AbortController();
    fetch(`/api/clientes/by-cpf?cpf=${digits}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((j: { cliente?: Cliente | null }) => {
        if (j.cliente) aplicaCliente(j.cliente, 'CPF');
      })
      .catch(() => {});
    return () => ac.abort();
  }, [cpf]); // eslint-disable-line react-hooks/exhaustive-deps

  // Busca cliente por Instagram (debounce) quando o handle tem 3+ caracteres
  useEffect(() => {
    const handle = cleanHandle(instagram);
    if (handle.length < 3 || handle === lastIgRef.current) return;
    const ac = new AbortController();
    const t = setTimeout(() => {
      lastIgRef.current = handle;
      fetch(`/api/clientes/by-instagram?instagram=${encodeURIComponent(handle)}`, {
        signal: ac.signal,
      })
        .then((r) => r.json())
        .then((j: { cliente?: Cliente | null }) => {
          if (j.cliente) aplicaCliente(j.cliente, 'Instagram');
        })
        .catch(() => {});
    }, 400);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [instagram]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (submitting) return;
    if (!nome.trim()) return onError('Informe o nome do cliente.');
    const cpfDigits = cpf.replace(/\D/g, '');
    if (cpfDigits && (cpfDigits.length !== 11 || !isValidCPF(cpfDigits))) {
      return onError('CPF inválido — confere os dígitos ou deixa em branco.');
    }
    const v = parseBRL(valor);
    if (!(v > 0)) return onError('Informe um valor válido.');

    setSubmitting(true);
    try {
      const r = await fetch('/api/vendas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          cpf: cpfDigits || undefined,
          instagram: cleanHandle(instagram) || undefined,
          whatsapp: whatsapp.trim() || undefined,
          valor: v,
          observacoes: obs.trim() || undefined,
        }),
      });
      const j = (await r.json()) as { venda?: Venda; error?: string };
      if (!r.ok || !j.venda) throw new Error(j.error || 'Falha ao registrar venda.');
      onCreated(j.venda);
      setNome('');
      setCpf('');
      setInstagram('');
      setWhatsapp('');
      setValor('');
      setObs('');
      setFoundBy(null);
      lastCpfRef.current = '';
      lastIgRef.current = '';
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  }

  const now = new Date();
  const prazo = new Date(now.getTime() + JANELA_RETIRADA_DIAS * 24 * 60 * 60 * 1000);
  const previewData = {
    codigo: 0,
    nome: nome.trim(),
    cpf: cpf.trim(),
    whatsapp: whatsapp.trim(),
    instagram: cleanHandle(instagram),
    valor: parseBRL(valor),
    criadoEm: now.toISOString(),
    prazoRetirada: prazo.toISOString(),
    observacoes: obs.trim(),
  };

  const vistas = recentes.filter((v) => v.status !== 'cancelada').slice(0, 6);

  return (
    <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 lg:items-stretch min-w-0">
      <div className="flex flex-col gap-6 min-w-0">
        <section className="lulu-card p-5 sm:p-7 min-w-0">
          <h2 className="font-display text-2xl text-lulu-magenta mb-1">Dados do pedido</h2>
          <p className="text-sm text-ink-soft mb-5">
            Registra a venda paga pelo Instagram. Busca a cliente por CPF ou @ do Insta. 🩷
          </p>

          <div className="space-y-4">
            <div>
              <label className="lulu-label flex items-center justify-between">
                <span>Nome completo</span>
                {foundBy && (
                  <span className="text-[11px] font-normal normal-case tracking-normal text-lulu-purple">
                    ✓ {foundBy}
                  </span>
                )}
              </label>
              <input
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={onKey}
                placeholder="Nome da cliente"
                className="lulu-input"
              />
            </div>

            <div>
              <label className="lulu-label">Instagram</label>
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                onKeyDown={onKey}
                placeholder="@usuario"
                className="lulu-input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="lulu-label">CPF (opcional)</label>
                <input
                  inputMode="numeric"
                  value={cpf}
                  onChange={(e) => setCpf(maskCPFInput(e.target.value))}
                  onKeyDown={onKey}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={`lulu-input ${cpfErr ? 'border-lulu-heart-red focus:border-lulu-heart-red focus:ring-lulu-heart-red/15' : ''}`}
                />
                {cpfErr && <p className="text-xs text-lulu-heart-red mt-1.5">{cpfErr}</p>}
              </div>
              <div>
                <label className="lulu-label">WhatsApp (opcional)</label>
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="(54) 90000-0000"
                  className="lulu-input"
                />
              </div>
            </div>

            <div>
              <label className="lulu-label">Valor da venda</label>
              <input
                inputMode="numeric"
                value={valor}
                onChange={(e) => setValor(maskBRLInput(e.target.value))}
                onKeyDown={onKey}
                placeholder="R$ 0,00"
                className="lulu-input"
              />
            </div>

            <div>
              <label className="lulu-label">Observações (opcional)</label>
              <input
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                onKeyDown={onKey}
                placeholder="Ex.: 2 peças, body + calça"
                className="lulu-input"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={submit}
              disabled={submitting}
              className="lulu-btn-primary w-full disabled:opacity-60"
            >
              {submitting ? 'Salvando…' : 'Registrar e imprimir guia'}
            </button>
          </div>
        </section>

        <section className="lulu-card p-5 sm:p-7 flex-1 flex flex-col min-h-0 min-w-0">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h2 className="font-display text-2xl text-lulu-magenta">Pedidos recentes</h2>
            {recentes.length > 6 && (
              <button
                onClick={onVerTodas}
                className="text-xs font-bold uppercase tracking-wider text-ink-soft hover:text-lulu-magenta transition"
              >
                ver todos →
              </button>
            )}
          </div>

          {vistas.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Nenhum pedido ainda. Registra o primeiro aí ao lado 🩷
            </p>
          ) : (
            <ul className="divide-y divide-line flex-1 overflow-y-auto -mx-2">
              {vistas.map((v) => (
                <li key={v.id}>
                  <button
                    onClick={() => onOpenVenda(v.id)}
                    className="w-full flex items-center justify-between gap-3 py-3 hover:bg-paper-tint -mx-2 px-2 rounded transition text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-ink truncate">{v.nome}</div>
                      <div className="text-xs text-ink-soft mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="font-mono">#{String(v.codigo).padStart(4, '0')}</span>
                        {v.instagram && (
                          <>
                            <span className="text-ink-mute">·</span>
                            <span>@{v.instagram}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <div className="font-display font-bold text-base text-lulu-magenta">
                        {formatBRL(v.valor)}
                      </div>
                      <div className="text-[10px] text-ink-mute uppercase tracking-wider">
                        {v.status === 'retirada' ? 'retirado' : 'aguardando'}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 min-w-0">
        <div className="lulu-card p-5 sm:p-7 min-w-0">
          <h2 className="font-display text-2xl text-lulu-magenta mb-1">Pré-visualização</h2>
          <p className="text-sm text-ink-soft mb-5">Como a guia vai sair na impressora.</p>
          <div className="bg-white max-w-[340px] mx-auto p-5 rounded shadow-md border-2 border-line">
            <GuiaVenda data={previewData} barcodeOpts={{ width: 1.4, height: 36 }} />
          </div>
        </div>
      </aside>
    </div>
  );
}
