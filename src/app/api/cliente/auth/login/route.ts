import { NextResponse } from 'next/server';
import { loginComSenha } from '@/lib/cliente-auth';
import { getClientIp, rateLimit, resetRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const key = `cliente-login:${ip}`;
  const rl = rateLimit({ key, max: 8, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tenta de novo em ${rl.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => null)) as { cpf?: string; senha?: string } | null;
  if (!body?.cpf || !body?.senha) {
    return NextResponse.json({ error: 'CPF e senha obrigatórios.' }, { status: 400 });
  }
  const result = await loginComSenha(body.cpf, body.senha);
  if (typeof result === 'string') {
    return NextResponse.json({ error: result }, { status: 401 });
  }
  resetRateLimit(key);
  return NextResponse.json({ ok: true });
}
