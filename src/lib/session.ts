import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  user?: string;
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

export function checkCredentials(user: string, pass: string): boolean {
  const expectedUser = process.env.AUTH_USER;
  const expectedPass = process.env.AUTH_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  return user === expectedUser && pass === expectedPass;
}
