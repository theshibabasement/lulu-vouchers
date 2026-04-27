import { NextResponse } from 'next/server';
import { checkCredentials, getSession } from '@/lib/session';
import { getClientIp, rateLimit, resetRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const key = `admin-login:${ip}`;
  const rl = rateLimit({ key, max: 8, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: `Muitas tentativas. Tenta de novo em ${rl.retryAfterSec}s.`,
      },
      { status: 429 },
    );
  }

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
  resetRateLimit(key);
  return NextResponse.json({ ok: true });
}
