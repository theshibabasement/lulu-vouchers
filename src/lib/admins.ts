import bcrypt from 'bcryptjs';
import { withClient } from './db';

export type AdminPerfil = 'dona' | 'atendente';

export interface Admin {
  id: number;
  username: string;
  nome: string;
  perfil: AdminPerfil;
  ativo: boolean;
  ultimoLoginEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

const SELECT_COLS = `id, username, nome, perfil, ativo, ultimo_login_em, criado_em, atualizado_em`;

function rowToAdmin(r: Record<string, unknown>): Admin {
  return {
    id: Number(r.id),
    username: r.username as string,
    nome: r.nome as string,
    perfil: r.perfil as AdminPerfil,
    ativo: !!r.ativo,
    ultimoLoginEm: r.ultimo_login_em ? (r.ultimo_login_em as Date).toISOString() : null,
    criadoEm: (r.criado_em as Date).toISOString(),
    atualizadoEm: (r.atualizado_em as Date).toISOString(),
  };
}

/**
 * Bootstrap: garante que sempre exista pelo menos um admin com perfil 'dona'.
 * Usa AUTH_USER/AUTH_PASSWORD do .env como credenciais iniciais.
 * Roda na inicialização do servidor.
 */
export async function ensureBootstrapAdmin(): Promise<void> {
  const envUser = process.env.AUTH_USER;
  const envPass = process.env.AUTH_PASSWORD;
  if (!envUser || !envPass) {
    console.warn('[admins] AUTH_USER/AUTH_PASSWORD não definidos — bootstrap skip.');
    return;
  }

  await withClient(async (c) => {
    const r = await c.query(
      `SELECT COUNT(*)::int AS qtd FROM admins WHERE perfil = 'dona' AND ativo = true`,
    );
    const qtd = Number(r.rows[0].qtd);
    if (qtd > 0) return;

    const hash = await bcrypt.hash(envPass, 10);
    await c.query(
      `INSERT INTO admins (username, nome, senha_hash, perfil, ativo)
       VALUES ($1, $2, $3, 'dona', true)
       ON CONFLICT (username) DO UPDATE SET
         senha_hash = EXCLUDED.senha_hash,
         perfil = 'dona',
         ativo = true,
         atualizado_em = NOW()`,
      [envUser, 'Administradora', hash],
    );
    console.log(`[admins] bootstrap: admin dona "${envUser}" criado/atualizado.`);
  });
}

export interface LoginResult {
  admin: Admin;
}

/** Tenta autenticar admin. Retorna o admin (sem hash) ou null. */
export async function autenticarAdmin(
  username: string,
  senha: string,
): Promise<Admin | null> {
  if (!username || !senha) return null;
  const row = await withClient(async (c) => {
    const r = await c.query(
      `SELECT id, username, nome, senha_hash, perfil, ativo,
              ultimo_login_em, criado_em, atualizado_em
       FROM admins WHERE username = $1 AND ativo = true`,
      [username.trim()],
    );
    return r.rows[0];
  });
  if (!row) return null;
  const ok = await bcrypt.compare(senha, row.senha_hash as string);
  if (!ok) return null;

  await withClient(async (c) => {
    await c.query(`UPDATE admins SET ultimo_login_em = NOW() WHERE id = $1`, [row.id]);
  });
  return rowToAdmin({ ...row, ultimo_login_em: new Date() });
}

export async function getAdmin(id: number): Promise<Admin | null> {
  return withClient(async (c) => {
    const r = await c.query(`SELECT ${SELECT_COLS} FROM admins WHERE id = $1`, [id]);
    if (r.rows.length === 0) return null;
    return rowToAdmin(r.rows[0]);
  });
}

export async function listAdmins(): Promise<Admin[]> {
  return withClient(async (c) => {
    const r = await c.query(
      `SELECT ${SELECT_COLS} FROM admins ORDER BY ativo DESC, perfil ASC, nome ASC`,
    );
    return r.rows.map(rowToAdmin);
  });
}

export interface CreateAdminInput {
  username: string;
  nome: string;
  senha: string;
  perfil: AdminPerfil;
}

export async function createAdmin(input: CreateAdminInput): Promise<Admin> {
  if (!input.username.trim()) throw new Error('Username obrigatório.');
  if (!input.nome.trim()) throw new Error('Nome obrigatório.');
  if (!input.senha || input.senha.length < 6) {
    throw new Error('Senha precisa de pelo menos 6 caracteres.');
  }
  if (input.perfil !== 'dona' && input.perfil !== 'atendente') {
    throw new Error('Perfil inválido.');
  }
  const hash = await bcrypt.hash(input.senha, 10);
  return withClient(async (c) => {
    const r = await c.query(
      `INSERT INTO admins (username, nome, senha_hash, perfil)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SELECT_COLS}`,
      [input.username.trim(), input.nome.trim(), hash, input.perfil],
    ).catch((e: { code?: string; message?: string }) => {
      if (e.code === '23505') throw new Error('Usuário já existe.');
      throw e;
    });
    return rowToAdmin(r.rows[0]);
  });
}

export interface UpdateAdminInput {
  nome?: string;
  senha?: string;
  perfil?: AdminPerfil;
  ativo?: boolean;
}

export async function updateAdmin(id: number, patch: UpdateAdminInput): Promise<Admin> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (patch.nome !== undefined) {
    fields.push(`nome = $${i++}`);
    values.push(patch.nome.trim());
  }
  if (patch.senha !== undefined) {
    if (patch.senha.length < 6) throw new Error('Senha precisa de pelo menos 6 caracteres.');
    const hash = await bcrypt.hash(patch.senha, 10);
    fields.push(`senha_hash = $${i++}`);
    values.push(hash);
  }
  if (patch.perfil !== undefined) {
    if (patch.perfil !== 'dona' && patch.perfil !== 'atendente') {
      throw new Error('Perfil inválido.');
    }
    fields.push(`perfil = $${i++}`);
    values.push(patch.perfil);
  }
  if (patch.ativo !== undefined) {
    fields.push(`ativo = $${i++}`);
    values.push(patch.ativo);
  }
  if (fields.length === 0) {
    const cur = await getAdmin(id);
    if (!cur) throw new Error('Admin não encontrado.');
    return cur;
  }
  fields.push(`atualizado_em = NOW()`);
  values.push(id);
  return withClient(async (c) => {
    const r = await c.query(
      `UPDATE admins SET ${fields.join(', ')} WHERE id = $${i} RETURNING ${SELECT_COLS}`,
      values,
    );
    if (r.rows.length === 0) throw new Error('Admin não encontrado.');
    return rowToAdmin(r.rows[0]);
  });
}

export async function deleteAdmin(id: number): Promise<void> {
  await withClient(async (c) => {
    // Não permite excluir o último 'dona' ativo
    const cur = await c.query<{ perfil: string; ativo: boolean }>(
      `SELECT perfil, ativo FROM admins WHERE id = $1`,
      [id],
    );
    if (cur.rows.length === 0) throw new Error('Admin não encontrado.');
    if (cur.rows[0].perfil === 'dona' && cur.rows[0].ativo) {
      const donas = await c.query<{ qtd: number }>(
        `SELECT COUNT(*)::int AS qtd FROM admins WHERE perfil = 'dona' AND ativo = true`,
      );
      if (Number(donas.rows[0].qtd) <= 1) {
        throw new Error('Não pode excluir a única dona ativa.');
      }
    }
    await c.query(`DELETE FROM admins WHERE id = $1`, [id]);
  });
}
