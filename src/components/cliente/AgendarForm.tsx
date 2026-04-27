'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { maskCPFInput, maskWhatsappInput, validateWhatsappBR } from '@/lib/format';
import { TAMANHOS_INFANTIS } from '@/lib/tamanhos';

interface Props {
  autenticado: boolean;
  nomePadrao?: string;
  cpfPadrao?: string;
  whatsappPadrao?: string;
}

export function AgendarForm({ autenticado, nomePadrao, cpfPadrao, whatsappPadrao }: Props) {
  const router = useRouter();
  const [nome, setNome] = useState(nomePadrao ?? '');
  const [cpf, setCpf] = useState(cpfPadrao ? maskCPFInput(cpfPadrao) : '');
  const [whatsapp, setWhatsapp] = useState(whatsappPadrao ?? '');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [qtd, setQtd] = useState('');
  const [tamanhos, setTamanhos] = useState<string[]>([]);
  const [obs, setObs] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function toggleTamanho(t: string) {
    setTamanhos((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!nome.trim()) return setErr('Informa teu nome.');
    if (!data || !hora) return setErr('Escolhe data e horário.');
    if (whatsapp.trim()) {
      const v = validateWhatsappBR(whatsapp);
      if (!v.valid) return setErr(`WhatsApp: ${v.error}`);
    }
    const dataHora = new Date(`${data}T${hora}:00`).toISOString();

    setBusy(true);
    try {
      const endpoint = autenticado ? '/api/cliente/agendamentos' : '/api/agendar';
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          cpf: cpf.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
          dataHora,
          qtdPecas: qtd ? parseInt(qtd, 10) : undefined,
          tamanhos,
          observacoes: obs.trim() || undefined,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error || 'Falha ao agendar.');
      setOk(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (ok) {
    const temWa = !!whatsapp.trim();
    return (
      <main className="min-h-screen bg-paper-sparkle px-4 py-10 grid place-items-center">
        <div className="max-w-md text-center bg-paper rounded-lg p-8 border-[3px] border-ink shadow-sticker-lg">
          <div className="text-5xl mb-4">🩷</div>
          <h1 className="font-display text-3xl text-lulu-purple mb-2">
            Avaliação solicitada!
          </h1>
          <p className="text-ink-soft mb-6">
            {temWa
              ? 'A Lulu vai confirmar contigo logo logo pelo WhatsApp ✨'
              : 'A Lulu recebeu teu pedido. Sem WhatsApp informado, te aguardamos no horário escolhido — ou passa na loja pra confirmar 🩷'}
          </p>
          <div className="grid gap-2">
            {autenticado ? (
              <Link href="/cliente" className="lulu-btn-primary text-center">
                Voltar ao painel
              </Link>
            ) : (
              <button
                onClick={() => router.refresh()}
                className="lulu-btn-secondary"
              >
                Agendar outra
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper-sparkle pb-24">
      <header className="bg-paper border-b-2 border-line">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-ink shrink-0">
            <Image src="/lulu-logo.jpg" alt="Lulu" fill sizes="40px" className="object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg text-lulu-purple leading-none">
              Agendar avaliação
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink-mute mt-0.5">
              Lulu Arteira · Brechó Infantil
            </div>
          </div>
          {autenticado && (
            <Link
              href="/cliente"
              className="text-[11px] font-bold uppercase tracking-wider text-ink-soft hover:text-lulu-magenta transition px-3 py-1.5 rounded-full border-2 border-line"
            >
              Painel
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        <p className="text-sm text-ink-soft mb-5">
          Marca um horário pra trazer as peças seminovas — assim a Lulu te
          atende rapidinho 🩷
        </p>

        <form
          onSubmit={submit}
          className="space-y-4 bg-paper rounded-lg p-5 border-2 border-line shadow-sm"
        >
          <Field label="Nome completo" required>
            <input
              autoComplete="name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="lulu-input"
              required
            />
          </Field>

          <Field label="CPF (opcional)" hint="Pra vincular ao teu cadastro">
            <input
              inputMode="numeric"
              value={cpf}
              onChange={(e) => setCpf(maskCPFInput(e.target.value))}
              maxLength={14}
              placeholder="000.000.000-00"
              className="lulu-input"
              autoComplete="off"
            />
          </Field>

          <Field label="WhatsApp" hint="Pra Lulu confirmar contigo">
            <input
              inputMode="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(maskWhatsappInput(e.target.value))}
              placeholder="(54) 99999-9999"
              className="lulu-input"
              autoComplete="tel"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data" required>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="lulu-input"
                required
                min={new Date().toISOString().slice(0, 10)}
              />
            </Field>
            <Field label="Hora" required>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="lulu-input"
                required
              />
            </Field>
          </div>

          <Field label="Quantidade aproximada de peças" hint="opcional">
            <input
              type="number"
              min={1}
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
              placeholder="ex: 15"
              className="lulu-input"
            />
          </Field>

          <div>
            <div className="lulu-label flex items-center justify-between">
              <span>Tamanhos</span>
              <span className="text-ink-mute font-normal normal-case tracking-normal text-[11px]">
                {tamanhos.length} selecionado{tamanhos.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TAMANHOS_INFANTIS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTamanho(t)}
                  className={`px-3 py-2 rounded-full text-xs font-bold border-2 transition ${
                    tamanhos.includes(t)
                      ? 'bg-lulu-magenta text-white border-ink shadow-sticker'
                      : 'bg-paper text-ink-soft border-line hover:border-ink-mute'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <Field label="Observações" hint="opcional">
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={3}
              className="lulu-input resize-none"
              placeholder="Qualquer detalhe que ajude a Lulu"
            />
          </Field>

          {err && (
            <div className="rounded-md bg-lulu-cheek-pink/40 border-2 border-lulu-heart-red px-3 py-2 text-sm text-ink">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="lulu-btn-primary w-full disabled:opacity-60"
          >
            {busy ? 'Enviando…' : 'Solicitar agendamento'}
          </button>

          <p className="text-xs text-ink-mute text-center">
            {whatsapp.trim()
              ? 'A Lulu confirma o horário pelo WhatsApp.'
              : 'Sem WhatsApp informado, te esperamos no horário escolhido.'}
          </p>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="lulu-label flex items-baseline justify-between">
        <span>{label}{required && <span className="text-lulu-magenta ml-1">*</span>}</span>
        {hint && <span className="text-ink-mute font-normal normal-case tracking-normal text-[11px]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
