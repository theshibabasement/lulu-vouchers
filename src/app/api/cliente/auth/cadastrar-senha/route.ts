import { NextResponse } from 'next/server';
import { cadastrarSenha, getCurrentCliente } from '@/lib/cliente-auth';

export async function POST(req: Request) {
  const cliente = await getCurrentCliente();
  if (!cliente) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { senha?: string } | null;
  if (!body?.senha) return NextResponse.json({ error: 'Senha obrigatória.' }, { status: 400 });
  try {
    await cadastrarSenha(cliente.id, body.senha);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
