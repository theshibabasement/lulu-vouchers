import { NextResponse } from 'next/server';
import { checkCredentials, getSession } from '@/lib/session';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { user?: string; password?: string }
    | null;
  if (!body?.user || !body?.password) {
    return NextResponse.json({ error: 'Credenciais ausentes.' }, { status: 400 });
  }
  if (!checkCredentials(body.user, body.password)) {
    return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 });
  }
  const session = await getSession();
  session.user = body.user;
  session.loggedAt = Date.now();
  await session.save();
  return NextResponse.json({ ok: true });
}
