'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user, password }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || 'Falha no login.');
      }
      router.replace(next);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-6 py-12 bg-paper-sparkle">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl text-lulu-purple mb-1">Lulu Arteira</h1>
          <p className="font-title text-sm uppercase tracking-[0.2em] text-lulu-magenta">
            Sistema de vales
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-paper rounded-lg shadow-lg border-[3px] border-ink p-7 space-y-5"
        >
          <h2 className="font-display text-2xl text-lulu-magenta text-center">
            Entrar 🩷
          </h2>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">
              Usuário
            </label>
            <input
              autoFocus
              autoComplete="username"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full px-4 py-3 rounded-md border-2 border-line bg-paper-tint focus:outline-none focus:border-lulu-magenta focus:ring-4 focus:ring-lulu-magenta/15 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">
              Senha
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-md border-2 border-line bg-paper-tint focus:outline-none focus:border-lulu-magenta focus:ring-4 focus:ring-lulu-magenta/15 transition"
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

        <p className="text-center text-xs text-ink-mute mt-6">
          Bora vir garimpar na Lulu? ✨
        </p>
      </div>
    </main>
  );
}
