import { NextResponse } from 'next/server';
import { loginComSenha } from '@/lib/cliente-auth';
import { ensureBootstrapAdmin } from '@/lib/admins';
import { loginAdmin } from '@/lib/session';
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

  // 1) Tenta cliente (CPF + senha)
  const clienteResult = await loginComSenha(body.cpf, body.senha);
  if (typeof clienteResult !== 'string') {
    resetRateLimit(key);
    return NextResponse.json({ ok: true });
  }

  // 2) Fallback: tenta admin com o mesmo input (username + senha).
  // Útil quando admin acessa o portal via PWA do cliente — em vez de
  // mostrar erro, redireciona pro painel admin.
  await ensureBootstrapAdmin().catch(() => {});
  const adminResult = await loginAdmin(body.cpf.trim(), body.senha);
  if (typeof adminResult !== 'string') {
    resetRateLimit(key);
    return NextResponse.json({ ok: true, redirect: '/admin' });
  }

  // Erro do cliente prevalece (tentativa primária)
  return NextResponse.json({ error: clienteResult }, { status: 401 });
}
