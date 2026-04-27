'use client';

import Image from 'next/image';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { maskCPFInput } from '@/lib/format';

interface Props {
  tokenInvalido?: boolean;
}

export function PortalLanding({ tokenInvalido }: Props) {
  const router = useRouter();
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch('/api/cliente/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cpf, senha }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error || 'Falha no login.');
      router.replace('/cliente');
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 bg-paper-sparkle">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-[4px] border-ink shadow-sticker-lg">
            <Image
              src="/lulu-logo.jpg"
              alt="Lulu Arteira"
              fill
              sizes="96px"
              priority
              className="object-cover"
            />
          </div>
          <h1 className="font-display text-4xl text-lulu-purple leading-none">
            Lulu Arteira
          </h1>
          <p className="font-title text-xs uppercase tracking-[0.2em] text-lulu-magenta mt-2">
            Portal do cliente
          </p>
        </div>

        {tokenInvalido && (
          <div className="rounded-md bg-lulu-cheek-pink/40 border-2 border-lulu-heart-red px-3 py-2 text-sm text-ink mb-4">
            Esse link de acesso não vale mais. Pede um novo recibo na loja ou
            faz login com CPF e senha 🩷
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="bg-paper rounded-lg shadow-lg border-[3px] border-ink p-6 space-y-4"
        >
          <h2 className="font-display text-2xl text-lulu-magenta text-center">
            Entrar
          </h2>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">
              CPF
            </label>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="off"
              value={cpf}
              onChange={(e) => setCpf(maskCPFInput(e.target.value))}
              maxLength={14}
              placeholder="000.000.000-00"
              className="w-full px-4 py-3 rounded-md border-2 border-line bg-paper-tint text-base focus:outline-none focus:border-lulu-magenta focus:ring-4 focus:ring-lulu-magenta/15 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">
              Senha
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-3 rounded-md border-2 border-line bg-paper-tint text-base focus:outline-none focus:border-lulu-magenta focus:ring-4 focus:ring-lulu-magenta/15 transition"
            />
          </div>

          {err && (
            <div className="rounded-md bg-lulu-cheek-pink/40 border-2 border-lulu-heart-red px-3 py-2 text-sm text-ink">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-md font-display font-bold text-lg bg-lulu-magenta text-white border-[3px] border-ink shadow-sticker hover:translate-y-[-2px] active:translate-y-[1px] transition disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 bg-paper-tint rounded-lg p-5 border-2 border-line text-sm text-ink-soft text-center">
          <p className="mb-2">
            <b className="text-ink">Primeira vez aqui?</b>
          </p>
          <p>
            Pega o recibo de um vale na loja e escaneia o <b>QR code</b> 🩷
          </p>
          <p className="mt-2">
            Depois é só criar uma senha pra acessar de qualquer lugar.
          </p>
        </div>

        <p className="text-center text-xs text-ink-mute mt-6">
          Bora vir garimpar na Lulu? ✨
        </p>
      </div>
    </main>
  );
}
