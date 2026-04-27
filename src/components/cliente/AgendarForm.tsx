'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { maskCPFInput, maskWhatsappInput, validateWhatsappBR } from '@/lib/format';
import { TAMANHOS_INFANTIS } from '@/lib/tamanhos';

interface Janela {
  start: string;
  end: string;
}

/** Gera slots de 30min dentro das janelas, com filtro de antecedência mínima. */
function generateSlots(janelas: Janela[], dataStr: string): string[] {
  const slots: string[] = [];
  const now = Date.now();
  const minTs = now + 60 * 60 * 1000; // 1h de antecedência
  for (const j of janelas) {
    const [hs, ms] = j.start.split(':').map(Number);
    const [he, me] = j.end.split(':').map(Number);
    const startMin = hs * 60 + ms;
    const endMin = he * 60 + me;
    for (let m = startMin; m <= endMin; m += 30) {
      const hh = Math.floor(m / 60);
      const mm = m % 60;
      const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      // Validar antecedência (montar em local SP)
      const ts = new Date(`${dataStr}T${time}:00-03:00`).getTime();
      if (ts >= minTs) slots.push(time);
    }
  }
  return slots;
}

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
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [clienteCriado, setClienteCriado] = useState(false);
  const [janelas, setJanelas] = useState<Janela[]>([]);
  const [loadingJanelas, setLoadingJanelas] = useState(false);

  // Carrega janelas disponíveis da data
  useEffect(() => {
    if (!data) {
      setJanelas([]);
      return;
    }
    setLoadingJanelas(true);
    fetch(`/api/horarios/disponiveis?data=${data}`)
      .then((r) => r.json())
      .then((j: { janelas?: Janela[] }) => setJanelas(j.janelas ?? []))
      .catch(() => setJanelas([]))
      .finally(() => setLoadingJanelas(false));
  }, [data]);

  const slots = useMemo(() => generateSlots(janelas, data), [janelas, data]);

  // Reseta hora se virou inválida pra nova data
  useEffect(() => {
    if (hora && !slots.includes(hora)) setHora('');
  }, [slots, hora]);

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
    // Constroi data em SP local (UTC-3 fixo, BR sem DST)
    const dataHora = new Date(`${data}T${hora}:00-03:00`).toISOString();

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
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        portalToken?: string | null;
        clienteCriado?: boolean;
      };
      if (!r.ok) throw new Error(j.error || 'Falha ao agendar.');
      // Se cliente foi criado agora, expõe URL com token pro cadastro de senha
      if (j.clienteCriado && j.portalToken) {
        const origin = window.location.origin;
        setPortalUrl(`${origin}/cliente/${encodeURIComponent(j.portalToken)}`);
        setClienteCriado(true);
      }
      setOk(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setOk(false);
    setPortalUrl(null);
    setClienteCriado(false);
    setNome(nomePadrao ?? '');
    setCpf(cpfPadrao ? maskCPFInput(cpfPadrao) : '');
    setWhatsapp(whatsappPadrao ?? '');
    setData('');
    setHora('');
    setQtd('');
    setTamanhos([]);
    setObs('');
    setErr(null);
  }

  if (ok) {
    const temWa = !!whatsapp.trim();
    return (
      <main className="min-h-screen bg-paper-sparkle px-4 py-10 grid place-items-center">
        <div className="max-w-md w-full text-center bg-paper rounded-lg p-8 border-[3px] border-ink shadow-sticker-lg">
          <div className="text-5xl mb-4">🩷</div>
          <h1 className="font-display text-3xl text-lulu-purple mb-2">
            Avaliação solicitada!
          </h1>
          <p className="text-ink-soft mb-6">
            {temWa
              ? 'A Lulu vai confirmar contigo logo logo pelo WhatsApp ✨'
              : 'A Lulu recebeu teu pedido. Sem WhatsApp informado, te aguardamos no horário escolhido — ou passa na loja pra confirmar 🩷'}
          </p>

          {clienteCriado && portalUrl && (
            <div className="bg-lulu-yellow/30 border-2 border-lulu-yellow rounded-md p-4 mb-4 text-left">
              <h3 className="font-display text-lg text-ink mb-1">
                Quer acompanhar pelo painel? 💛
              </h3>
              <p className="text-sm text-ink-soft mb-3">
                Crie uma conta agora pra ver tua avaliação, futuros vales e
                histórico de qualquer celular.
              </p>
              <a
                href={portalUrl}
                className="lulu-btn-primary w-full text-center inline-block"
              >
                Criar minha conta
              </a>
            </div>
          )}

          <div className="grid gap-2">
            {autenticado ? (
              <Link href="/cliente" className="lulu-btn-primary text-center">
                Voltar ao painel
              </Link>
            ) : (
              <>
                <button onClick={resetForm} className="lulu-btn-secondary">
                  Agendar outra
                </button>
                <Link href="/cliente" className="text-xs text-ink-mute hover:text-ink underline mt-1">
                  Já tem conta? Entrar
                </Link>
              </>
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
            <Field label="Hora" required hint={slotsHint(loadingJanelas, janelas, slots, !!data)}>
              <select
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                disabled={!data || slots.length === 0}
                className="lulu-input disabled:opacity-60"
                required
              >
                <option value="">
                  {!data
                    ? 'Escolhe a data primeiro'
                    : loadingJanelas
                    ? 'Carregando…'
                    : slots.length === 0
                    ? 'Sem horário'
                    : 'Selecione…'}
                </option>
                {slots.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {data && !loadingJanelas && janelas.length === 0 && (
            <div className="rounded-md bg-lulu-cheek-pink/40 border-2 border-lulu-heart-red px-3 py-2 text-sm text-ink">
              Lulu não tem horário disponível nesse dia. Escolhe outra data 🩷
            </div>
          )}
          {data && !loadingJanelas && janelas.length > 0 && slots.length === 0 && (
            <div className="rounded-md bg-lulu-yellow/30 border-2 border-lulu-yellow px-3 py-2 text-sm text-ink">
              Sem horários livres com 1h de antecedência hoje. Tenta outra data.
            </div>
          )}

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

function slotsHint(
  loading: boolean,
  janelas: { start: string; end: string }[],
  slots: string[],
  hasDate: boolean,
): string | undefined {
  if (!hasDate) return undefined;
  if (loading) return undefined;
  if (janelas.length === 0) return 'fechado';
  if (slots.length === 0) return 'sem vaga';
  return janelas.map((j) => `${j.start}–${j.end}`).join(' · ');
}
