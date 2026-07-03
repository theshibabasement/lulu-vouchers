'use client';

import { useEffect, useState } from 'react';
import { formatBRL, formatCPF, formatDate, formatDateTime, maskWhatsappInput, validateWhatsappBR, whatsappLink } from '@/lib/format';
import type { Cliente, Vale } from '@/lib/types';
import { TagsEditor } from './TagsEditor';
import { MesclarClienteModal } from './MesclarClienteModal';

interface Props {
  clienteId: number | null;
  portalBase: string;
  onClose: () => void;
  onChanged: () => void;
  onOpenVale: (id: string) => void;
}

interface ClientePayload {
  cliente: Cliente;
  vales: Vale[];
}

export function ClienteDetail({ clienteId, portalBase, onClose, onChanged, onOpenVale }: Props) {
  const [data, setData] = useState<ClientePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showMesclar, setShowMesclar] = useState(false);
  const [form, setForm] = useState<Partial<Cliente>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (clienteId === null) {
      setData(null);
      setEditing(false);
      return;
    }
    setLoading(true);
    setErr(null);
    fetch(`/api/clientes/${clienteId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setData(j as ClientePayload);
        setForm(j.cliente);
      })
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, [clienteId]);

  useEffect(() => {
    document.body.style.overflow = clienteId !== null ? 'hidden' : '';
  }, [clienteId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && clienteId !== null) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clienteId, onClose]);

  if (clienteId === null) return null;

  async function doDelete() {
    if (!data || deleting) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/clientes/${data.cliente.id}`, { method: 'DELETE' });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error || 'Falha ao excluir.');
      onChanged();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  async function regenerarToken() {
    if (!data || regenerating) return;
    setRegenerating(true);
    setErr(null);
    try {
      const r = await fetch(`/api/clientes/${data.cliente.id}/regenerar-token`, {
        method: 'POST',
      });
      const j = (await r.json().catch(() => ({}))) as { cliente?: Cliente; error?: string };
      if (!r.ok || !j.cliente) throw new Error(j.error || 'Falha ao regenerar.');
      setData({ ...data, cliente: j.cliente });

      // Monta link novo + msg + abre wa.me se cliente tem WhatsApp
      const url = `${portalBase}/cliente/${encodeURIComponent(j.cliente.portalToken ?? '')}`;
      const msg =
        `Oi ${j.cliente.nome.split(' ')[0]}! Geramos um novo link de acesso pra os seus vales:\n` +
        `${url}\n\n` +
        `O link antigo (e a senha, se você tinha cadastrado) foram desativados por segurança.`;
      const wa = j.cliente.whatsapp ? whatsappLink(j.cliente.whatsapp) : null;
      if (wa) {
        const fullLink = `${wa}?text=${encodeURIComponent(msg)}`;
        window.open(fullLink, '_blank', 'noopener,noreferrer');
      } else {
        // Sem WhatsApp — copia URL pra clipboard como fallback
        navigator.clipboard.writeText(url).catch(() => {});
        alert(`Novo link gerado e copiado:\n\n${url}`);
      }
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setRegenerating(false);
    }
  }

  async function doRestore() {
    if (!data || deleting) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/clientes/${data.cliente.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error || 'Falha ao restaurar.');
      onChanged();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    setErr(null);
    if (form.whatsapp && form.whatsapp.trim()) {
      const v = validateWhatsappBR(form.whatsapp);
      if (!v.valid) {
        setErr(`WhatsApp: ${v.error}`);
        setSaving(false);
        return;
      }
    }
    try {
      const r = await fetch(`/api/clientes/${data.cliente.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          whatsapp: form.whatsapp ?? null,
          email: form.email ?? null,
          instagram: form.instagram ?? null,
          endereco: form.endereco ?? null,
          cidade: form.cidade ?? null,
          observacoes: form.observacoes ?? null,
        }),
      });
      const j = (await r.json()) as { cliente?: Cliente; error?: string };
      if (!r.ok || !j.cliente) throw new Error(j.error || 'Falha ao salvar.');
      setData({ ...data, cliente: j.cliente });
      setForm(j.cliente);
      setEditing(false);
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const cliente = data?.cliente;
  const vales = data?.vales ?? [];
  const wa = cliente?.whatsapp ? whatsappLink(cliente.whatsapp) : null;
  const totalEmitido = vales.reduce((sum, v) => sum + v.valorOriginal, 0);
  const totalSaldo = vales.reduce((sum, v) => sum + v.saldo, 0);

  return (
    <>
      <div className="lulu-overlay fixed inset-0 bg-ink/40 backdrop-blur z-[100]" onClick={onClose} />
      <aside className="lulu-slide-over fixed top-0 right-0 bottom-0 w-full sm:w-[520px] max-w-[100vw] bg-paper z-[101] shadow-2xl overflow-y-auto border-l-2 border-line">
        <div className="sticky top-0 bg-paper flex items-center justify-between px-6 py-4 border-b-2 border-line z-10">
          <h3 className="font-display text-xl text-lulu-purple">
            {cliente?.nome ?? 'Cliente'}
          </h3>
          <button
            onClick={onClose}
            className="text-2xl text-ink-mute hover:text-ink hover:bg-paper-tint w-9 h-9 rounded-md transition"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading && <div className="text-ink-soft">Carregando…</div>}
          {err && (
            <div className="rounded-md bg-lulu-cheek-pink/40 border-2 border-lulu-heart-red px-3 py-2 text-sm text-ink mb-4">
              {err}
            </div>
          )}

          {cliente && !editing && (
            <>
              <div className="rounded-lg bg-gradient-to-br from-lulu-purple to-lulu-magenta text-white p-5 mb-5">
                <div className="text-xs uppercase tracking-[0.16em] opacity-80">
                  Crédito acumulado
                </div>
                <div className="font-display text-4xl font-extrabold my-1">
                  {formatBRL(totalEmitido)}
                </div>
                <div className="text-xs opacity-85 flex justify-between mt-1">
                  <span>Saldo restante: {formatBRL(totalSaldo)}</span>
                  <span>{vales.length} vale{vales.length === 1 ? '' : 's'}</span>
                </div>
              </div>

              <Section title="Dados pessoais">
                <Row k="CPF" v={<span className="font-mono">{formatCPF(cliente.cpf)}</span>} />
                <Row k="WhatsApp" v={cliente.whatsapp || '—'} />
                <Row k="Instagram" v={cliente.instagram ? '@' + cliente.instagram : '—'} />
                <Row k="E-mail" v={cliente.email || '—'} />
                <Row k="Endereço" v={cliente.endereco || '—'} />
                <Row k="Cidade" v={cliente.cidade || '—'} />
                {cliente.observacoes && <Row k="Obs." v={cliente.observacoes} />}
                <Row k="Cadastrado em" v={formatDateTime(cliente.criadoEm)} />
              </Section>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    className="lulu-btn-accent text-center"
                  >
                    Abrir WhatsApp
                  </a>
                )}
                <button onClick={() => setEditing(true)} className={`lulu-btn-secondary ${wa ? '' : 'col-span-2'}`}>
                  Editar dados
                </button>
              </div>

              <Section title={`Vales (${vales.length})`}>
                {vales.length === 0 ? (
                  <p className="text-sm text-ink-soft">Nenhum vale ainda.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {vales.map((v) => (
                      <li key={v.id}>
                        <button
                          onClick={() => onOpenVale(v.id)}
                          className="w-full flex items-center justify-between py-3 hover:bg-paper-tint -mx-2 px-2 rounded transition"
                        >
                          <div className="text-left">
                            <div className="font-mono text-xs text-ink-mute font-semibold">{v.id}</div>
                            <div className="text-xs text-ink-soft">{formatDate(v.criadoEm)}</div>
                          </div>
                          <div className="text-right">
                            <div className={`font-display font-bold text-base ${v.saldo === 0 ? 'text-ink-mute line-through' : 'text-lulu-magenta'}`}>
                              {formatBRL(v.saldo)}
                            </div>
                            <div className="text-[10px] text-ink-mute uppercase tracking-wider">
                              de {formatBRL(v.valorOriginal)}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {!cliente.deletadoEm && (
                <Section title="Tags">
                  <TagsEditor clienteId={cliente.id} onChanged={onChanged} />
                </Section>
              )}

              {!cliente.deletadoEm && (
                <Section title="Mesclar com outro cadastro">
                  <p className="text-xs text-ink-soft mb-3">
                    Quando há dois cadastros pra mesma pessoa, mescla todos os
                    vales/avaliações/tags pra um só. O outro fica como
                    excluído.
                  </p>
                  <button
                    onClick={() => setShowMesclar(true)}
                    className="lulu-btn-secondary w-full"
                  >
                    Mesclar este cliente em outro
                  </button>
                </Section>
              )}

              {!cliente.deletadoEm && (
                <Section title="Acesso ao portal">
                  <p className="text-xs text-ink-soft mb-3">
                    {cliente.temSenha
                      ? 'Cliente tem senha cadastrada e acesso por QR.'
                      : 'Cliente acessa por QR (senha não cadastrada ainda).'}
                  </p>
                  <button
                    onClick={regenerarToken}
                    disabled={regenerating}
                    className="lulu-btn-secondary w-full disabled:opacity-60"
                  >
                    {regenerating ? 'Gerando…' : 'Gerar novo link de acesso'}
                  </button>
                  <p className="text-[11px] text-ink-mute mt-2 leading-relaxed">
                    Use quando o cliente perder o recibo + esquecer a senha.
                    O QR antigo e a senha cadastrada são invalidados.
                    {cliente.whatsapp
                      ? ' O novo link abre direto no WhatsApp.'
                      : ' Sem WhatsApp cadastrado — o link será copiado.'}
                  </p>
                </Section>
              )}

              {cliente.deletadoEm ? (
                <Section title="Cliente excluído">
                  <p className="text-xs text-ink-soft mb-3">
                    Soft delete em {formatDateTime(cliente.deletadoEm)}.
                  </p>
                  <button
                    onClick={doRestore}
                    disabled={deleting}
                    className="lulu-btn-accent w-full disabled:opacity-60"
                  >
                    {deleting ? 'Restaurando…' : 'Restaurar cliente'}
                  </button>
                </Section>
              ) : (
                <Section title="Excluir cliente">
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full px-4 py-3 rounded-md font-bold text-sm border-2 border-lulu-heart-red text-lulu-heart-red bg-paper hover:bg-lulu-cheek-pink/20 transition"
                    >
                      Excluir este cliente
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-ink-soft">
                        O cliente some das listagens (soft delete). Os vales
                        existentes não são afetados. Pode restaurar depois.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setConfirmDelete(false)}
                          disabled={deleting}
                          className="lulu-btn-secondary"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={doDelete}
                          disabled={deleting}
                          className="px-4 py-3 rounded-md font-display font-bold text-base border-[3px] border-ink shadow-sticker bg-lulu-heart-red text-white active:translate-y-[2px] active:shadow-none transition disabled:opacity-60"
                        >
                          {deleting ? 'Excluindo…' : 'Confirmar exclusão'}
                        </button>
                      </div>
                    </div>
                  )}
                </Section>
              )}
            </>
          )}

          {cliente && editing && (
            <div className="space-y-4">
              <Field label="Nome" value={form.nome ?? ''} onChange={(v) => setForm({ ...form, nome: v })} />
              <Field
                label="WhatsApp"
                value={form.whatsapp ?? ''}
                onChange={(v) => setForm({ ...form, whatsapp: maskWhatsappInput(v) })}
                placeholder="(54) 99999-9999"
              />
              <Field label="Instagram" value={form.instagram ?? ''} onChange={(v) => setForm({ ...form, instagram: v })} placeholder="@usuario" />
              <Field label="E-mail" value={form.email ?? ''} onChange={(v) => setForm({ ...form, email: v })} placeholder="opcional" />
              <Field label="Endereço" value={form.endereco ?? ''} onChange={(v) => setForm({ ...form, endereco: v })} placeholder="opcional" />
              <Field label="Cidade" value={form.cidade ?? ''} onChange={(v) => setForm({ ...form, cidade: v })} placeholder="opcional" />
              <Field
                label="Observações"
                value={form.observacoes ?? ''}
                onChange={(v) => setForm({ ...form, observacoes: v })}
                placeholder="opcional"
                multiline
              />

              <div className="grid grid-cols-2 gap-2 pt-3">
                <button
                  onClick={() => {
                    setEditing(false);
                    if (cliente) setForm(cliente);
                  }}
                  className="lulu-btn-secondary"
                >
                  Cancelar
                </button>
                <button onClick={save} disabled={saving} className="lulu-btn-primary disabled:opacity-60">
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {showMesclar && cliente && (
        <MesclarClienteModal
          source={cliente}
          onClose={() => setShowMesclar(false)}
          onMesclado={() => {
            setShowMesclar(false);
            onChanged();
            onClose();
          }}
        />
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-ink-soft mb-3">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-line text-sm last:border-b-0 gap-3">
      <span className="text-ink-soft shrink-0">{k}</span>
      <span className="text-ink text-right break-words">{v}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="lulu-label">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="lulu-input resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="lulu-input"
        />
      )}
    </div>
  );
}
