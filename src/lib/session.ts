import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { autenticarAdmin, getAdmin, type Admin } from './admins';

export interface SessionData {
  user?: string;
  adminId?: number;
  perfil?: 'dona' | 'atendente';
  loggedAt?: number;
}

export function sessionOptions(): SessionOptions {
  const password = process.env.AUTH_SECRET;
  if (!password || password.length < 32) {
    throw new Error('AUTH_SECRET deve ter ao menos 32 caracteres');
  }
  return {
    password,
    cookieName: 'lulu_session',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 12, // 12h
      path: '/',
    },
  };
}

export async function getSession() {
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions());
}

/** Login admin via tabela `admins`. Retorna admin OR string de erro. */
export async function loginAdmin(
  username: string,
  password: string,
): Promise<Admin | string> {
  const admin = await autenticarAdmin(username, password);
  if (!admin) return 'Usuário ou senha inválidos.';
  const session = await getSession();
  session.user = admin.username;
  session.adminId = admin.id;
  session.perfil = admin.perfil;
  session.loggedAt = Date.now();
  await session.save();
  return admin;
}

export async function getCurrentAdmin(): Promise<Admin | null> {
  const session = await getSession();
  if (!session.adminId) return null;
  const admin = await getAdmin(session.adminId);
  if (!admin || !admin.ativo) return null;
  return admin;
}
