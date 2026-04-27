import bcrypt from 'bcryptjs';
import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { withClient } from './db';
import type { Cliente } from './types';

export interface ClienteSessionData {
  clienteId?: number;
  qrAuth?: boolean; // entrou via QR code
  loggedAt?: number;
}

export function clienteSessionOptions(): SessionOptions {
  const password = process.env.AUTH_SECRET;
  if (!password || password.length < 32) {
    throw new Error('AUTH_SECRET deve ter ao menos 32 caracteres');
  }
  return {
    password,
    cookieName: 'lulu_cliente_session',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      path: '/',
    },
  };
}

export async function getClienteSession() {
  const store = await cookies();
  return getIronSession<ClienteSessionData>(store, clienteSessionOptions());
}

/** Resolve cliente da sessão ativa. null se não logado ou inválido. */
export async function getCurrentCliente(): Promise<Cliente | null> {
  const session = await getClienteSession();
  if (!session.clienteId) return null;
  const c = await withClient(async (cli) => {
    const r = await cli.query(
      `SELECT id, cpf, nome, whatsapp, email, endereco, cidade, observacoes,
              portal_token, senha_hash, portal_ativado_em, criado_em, atualizado_em
       FROM clientes WHERE id = $1 AND deletado_em IS NULL`,
      [session.clienteId],
    );
    return r.rows[0];
  });
  if (!c) return null;
  return {
    id: Number(c.id),
    cpf: c.cpf,
    nome: c.nome,
    whatsapp: c.whatsapp ?? null,
    email: c.email ?? null,
    endereco: c.endereco ?? null,
    cidade: c.cidade ?? null,
    observacoes: c.observacoes ?? null,
    portalToken: c.portal_token ?? null,
    temSenha: !!c.senha_hash,
    portalAtivadoEm: c.portal_ativado_em ? c.portal_ativado_em.toISOString() : null,
    criadoEm: c.criado_em.toISOString(),
    atualizadoEm: c.atualizado_em.toISOString(),
  };
}

/** Login via token de QR. Retorna cliente ou null. Seta sessão se válido. */
export async function loginViaToken(token: string): Promise<Cliente | null> {
  if (!token) return null;
  const result = await withClient(async (cli) => {
    const r = await cli.query(
      `SELECT id, cpf, nome, whatsapp, email, endereco, cidade, observacoes,
              portal_token, senha_hash, portal_ativado_em, criado_em, atualizado_em
       FROM clientes WHERE portal_token = $1 AND deletado_em IS NULL`,
      [token],
    );
    return r.rows[0];
  });
  if (!result) return null;
  const session = await getClienteSession();
  session.clienteId = Number(result.id);
  session.qrAuth = true;
  session.loggedAt = Date.now();
  await session.save();
  return {
    id: Number(result.id),
    cpf: result.cpf,
    nome: result.nome,
    whatsapp: result.whatsapp ?? null,
    email: result.email ?? null,
    endereco: result.endereco ?? null,
    cidade: result.cidade ?? null,
    observacoes: result.observacoes ?? null,
    portalToken: result.portal_token ?? null,
    temSenha: !!result.senha_hash,
    portalAtivadoEm: result.portal_ativado_em ? result.portal_ativado_em.toISOString() : null,
    criadoEm: result.criado_em.toISOString(),
    atualizadoEm: result.atualizado_em.toISOString(),
  };
}

/** Login via CPF + senha. Retorna cliente ou erro string. */
export async function loginComSenha(cpf: string, senha: string): Promise<Cliente | string> {
  const cpfDigits = cpf.replace(/\D/g, '');
  if (cpfDigits.length !== 11) return 'CPF inválido.';
  if (!senha || senha.length < 4) return 'Senha inválida.';
  const row = await withClient(async (cli) => {
    const r = await cli.query(
      `SELECT id, cpf, nome, whatsapp, email, endereco, cidade, observacoes,
              portal_token, senha_hash, portal_ativado_em, criado_em, atualizado_em
       FROM clientes WHERE cpf = $1 AND deletado_em IS NULL`,
      [cpfDigits],
    );
    return r.rows[0];
  });
  if (!row || !row.senha_hash) return 'CPF ou senha incorretos.';
  const ok = await bcrypt.compare(senha, row.senha_hash);
  if (!ok) return 'CPF ou senha incorretos.';
  const session = await getClienteSession();
  session.clienteId = Number(row.id);
  session.qrAuth = false;
  session.loggedAt = Date.now();
  await session.save();
  return {
    id: Number(row.id),
    cpf: row.cpf,
    nome: row.nome,
    whatsapp: row.whatsapp ?? null,
    email: row.email ?? null,
    endereco: row.endereco ?? null,
    cidade: row.cidade ?? null,
    observacoes: row.observacoes ?? null,
    portalToken: row.portal_token ?? null,
    temSenha: true,
    portalAtivadoEm: row.portal_ativado_em ? row.portal_ativado_em.toISOString() : null,
    criadoEm: row.criado_em.toISOString(),
    atualizadoEm: row.atualizado_em.toISOString(),
  };
}

export async function cadastrarSenha(clienteId: number, senha: string): Promise<void> {
  if (!senha || senha.length < 6) throw new Error('A senha precisa de pelo menos 6 caracteres.');
  const hash = await bcrypt.hash(senha, 10);
  await withClient(async (cli) => {
    await cli.query(
      `UPDATE clientes
       SET senha_hash = $1, portal_ativado_em = COALESCE(portal_ativado_em, NOW()), atualizado_em = NOW()
       WHERE id = $2`,
      [hash, clienteId],
    );
  });
}

export async function logoutCliente() {
  const session = await getClienteSession();
  session.destroy();
}
