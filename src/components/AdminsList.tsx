'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/format';

interface Admin {
  id: number;
  username: string;
  nome: string;
  perfil: 'dona' | 'atendente';
  ativo: boolean;
  ultimoLoginEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

interface Props {
  selfId: number;
  onToast: (msg: string, kind?: 'success' | 'error') => void;
}

export function AdminsList({ selfId, onToast }: Props) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admins', { cache: 'no-store' });
      const j = (await r.json()) as { admins?: Admin[]; error?: string };
      if (!r.ok) throw new Error(j.error || 'Falha ao carregar.');
      setAdmins(j.admins ?? []);
    } catch (e) {
      onToast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleAtivo(a: Admin) {
    try {
      const r = await fetch(`/api/admins/${a.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ativo: !a.ativo }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error || 'Falha.');
      onToast(a.ativo ? 'Usuário desativado.' : 'Usuário ativado.', 'success');
      load();
    } catch (e) {
      onToast((e as Error).message, 'error');
    }
  }

  async function remover(a: Admin) {
    if (!confirm(`Excluir o usuário "${a.nome}" (@${a.username})?`)) return;
    try {
      const r = await fetch(`/api/admins/${a.id}`, { method: 'DELETE' });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error || 'Falha.');
      onToast('Usuário excluído.', 'success');
      load();
    } catch (e) {
      onToast((e as Error).message, 'error');
    }
  }

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(a: Admin) {
    setEditing(a);
    setShowForm(true);
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <p className="text-sm text-ink-soft">
          {admins.length} usuário{admins.length === 1 ? '' : 's'} no sistema.
        </p>
        <button onClick={openCreate} className="lulu-btn-primary">
          + Novo usuário
        </button>
      </div>

      {loading && <div className="text-ink-soft text-sm">Carregando…</div>}

      <div className="space-y-2">
        {admins.map((a) => {
          const isSelf = a.id === selfId;
          return (
            <div
              key={a.id}
              className={`bg-paper rounded-md p-4 border-2 ${
                a.ativo ? 'border-line' : 'border-lulu-cheek-pink opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-ink">{a.nome}</span>
                    <span className="text-xs text-ink-soft font-mono">@{a.username}</span>
                    <span
                      className={`lulu-pill ${
                        a.perfil === 'dona'
                          ? 'bg-lulu-magenta text-white'
                          : 'bg-lulu-cyan-soft text-lulu-cyan'
                      }`}
                    >
                      {a.perfil}
                    </span>
                    {!a.ativo && (
                      <span className="lulu-pill bg-lulu-cheek-pink text-lulu-heart-red">
                        inativo
                      </span>
                    )}
                    {isSelf && (
                      <span className="text-[10px] text-ink-mute uppercase tracking-wider">
                        (você)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-soft mt-1">
                    Último login: {a.ultimoLoginEm ? formatDateTime(a.ultimoLoginEm) : 'nunca'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openEdit(a)}
                    className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-line bg-paper text-ink hover:border-ink-mute transition"
                  >
                    Editar
                  </button>
                  {!isSelf && (
                    <>
                      <button
                        onClick={() => toggleAtivo(a)}
                        className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-line bg-paper text-ink-soft hover:border-ink-mute transition"
                      >
                        {a.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => remover(a)}
                        className="text-xs font-bold px-3 py-1.5 rounded-full border-2 border-line bg-paper text-ink-mute hover:text-lulu-heart-red hover:border-lulu-heart-red transition"
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <AdminForm
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            onToast(editing ? 'Usuário atualizado.' : 'Usuário criado.', 'success');
            load();
          }}
        />
      )}
    </>
  );
}

interface FormProps {
  editing: Admin | null;
  onClose: () => void;
  onSaved: () => void;
}

function AdminForm({ editing, onClose, onSaved }: FormProps) {
  const [username, setUsername] = useState(editing?.username ?? '');
  const [nome, setNome] = useState(editing?.nome ?? '');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState<'dona' | 'atendente'>(editing?.perfil ?? 'atendente');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!nome.trim()) return setErr('Informe o nome.');
    if (!editing && !username.trim()) return setErr('Informe o username.');
    if (!editing && (!senha || senha.length < 6)) {
      return setErr('Senha precisa de pelo menos 6 caracteres.');
    }
    if (editing && senha && senha.length < 6) {
      return setErr('Nova senha precisa de pelo menos 6 caracteres.');
    }
    setBusy(true);
    try {
      const r = await fetch(editing ? `/api/admins/${editing.id}` : '/api/admins', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          editing
            ? {
                nome,
                perfil,
                ...(senha ? { senha } : {}),
              }
            : { username, nome, senha, perfil },
        ),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error || 'Falha ao salvar.');
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
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
        <h3 className="font-display text-2xl text-lulu-purple mb-4">
          {editing ? 'Editar usuário' : 'Novo usuário'}
        </h3>

        <div className="space-y-3">
          <div>
            <label className="lulu-label">Nome</label>
            <input
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="lulu-input"
            />
          </div>
          <div>
            <label className="lulu-label">Usuário (login)</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!!editing}
              className="lulu-input disabled:opacity-60"
              autoComplete="off"
            />
            {editing && (
              <p className="text-[11px] text-ink-mute mt-1">
                Username não pode ser alterado.
              </p>
            )}
          </div>
          <div>
            <label className="lulu-label">
              {editing ? 'Nova senha (opcional)' : 'Senha'}
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              className="lulu-input"
              placeholder={editing ? 'Deixe em branco pra manter' : ''}
            />
          </div>
          <div>
            <label className="lulu-label">Perfil</label>
            <select
              value={perfil}
              onChange={(e) => setPerfil(e.target.value as 'dona' | 'atendente')}
              className="lulu-input"
            >
              <option value="atendente">Atendente</option>
              <option value="dona">Dona</option>
            </select>
            <p className="text-[11px] text-ink-mute mt-1">
              <b>Dona</b> pode gerenciar usuários. <b>Atendente</b> pode usar
              tudo exceto a tela de Usuários.
            </p>
          </div>

          {err && (
            <div className="rounded-md bg-lulu-cheek-pink/40 border-2 border-lulu-heart-red px-3 py-2 text-sm text-ink">
              {err}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={onClose} disabled={busy} className="lulu-btn-secondary">
              Cancelar
            </button>
            <button onClick={submit} disabled={busy} className="lulu-btn-primary disabled:opacity-60">
              {busy ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
