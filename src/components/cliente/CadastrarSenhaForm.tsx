'use client';

import { useState, type FormEvent } from 'react';

interface Props {
  onDone: () => void;
  onCancel: () => void;
}

export function CadastrarSenhaForm({ onDone, onCancel }: Props) {
  const [senha, setSenha] = useState('');
  const [conf, setConf] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (senha.length < 6) {
      setErr('Senha precisa de pelo menos 6 caracteres.');
      return;
    }
    if (senha !== conf) {
      setErr('As senhas não conferem.');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/cliente/auth/cadastrar-senha', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ senha }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error || 'Falha ao salvar.');
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-paper rounded-lg p-5 border-[3px] border-ink shadow-sticker space-y-3"
    >
      <h3 className="font-display text-xl text-lulu-magenta">Criar senha 🔒</h3>
      <p className="text-sm text-ink-soft">
        Pra acessar de qualquer celular sem precisar do recibo.
      </p>

      <div>
        <label className="lulu-label">Nova senha</label>
        <input
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="lulu-input"
          minLength={6}
        />
      </div>

      <div>
        <label className="lulu-label">Confirma a senha</label>
        <input
          type="password"
          autoComplete="new-password"
          value={conf}
          onChange={(e) => setConf(e.target.value)}
          className="lulu-input"
          minLength={6}
        />
      </div>

      {err && (
        <div className="rounded-md bg-lulu-cheek-pink/40 border-2 border-lulu-heart-red px-3 py-2 text-sm text-ink">
          {err}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={busy} className="lulu-btn-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={busy} className="lulu-btn-primary disabled:opacity-60">
          {busy ? 'Salvando…' : 'Salvar senha'}
        </button>
      </div>
    </form>
  );
}
