import { NextResponse } from 'next/server';
import { ensureBootstrapAdmin } from '@/lib/admins';
import { loginAdmin } from '@/lib/session';
import { getClientIp, rateLimit, resetRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const key = `admin-login:${ip}`;
  const rl = rateLimit({ key, max: 8, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tenta de novo em ${rl.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  // Garante que sempre exista pelo menos uma dona (cria a partir de env
  // var na primeira execução).
  await ensureBootstrapAdmin().catch((e) => {
    console.error('[admin-login] bootstrap falhou:', e);
  });

  const body = (await req.json().catch(() => null)) as
    | { user?: string; password?: string }
    | null;
  if (!body?.user || !body?.password) {
    return NextResponse.json({ error: 'Credenciais ausentes.' }, { status: 400 });
  }
  const result = await loginAdmin(body.user, body.password);
  if (typeof result === 'string') {
    return NextResponse.json({ error: result }, { status: 401 });
  }
  resetRateLimit(key);
  return NextResponse.json({ ok: true, perfil: result.perfil });
}
