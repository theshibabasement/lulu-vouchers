import { NextResponse } from 'next/server';
import { loginComSenha } from '@/lib/cliente-auth';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { cpf?: string; senha?: string } | null;
  if (!body?.cpf || !body?.senha) {
    return NextResponse.json({ error: 'CPF e senha obrigatórios.' }, { status: 400 });
  }
  const result = await loginComSenha(body.cpf, body.senha);
  if (typeof result === 'string') {
    return NextResponse.json({ error: result }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
