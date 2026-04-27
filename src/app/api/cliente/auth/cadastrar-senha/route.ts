import { NextResponse } from 'next/server';
import { cadastrarSenha, getCurrentCliente } from '@/lib/cliente-auth';

export async function POST(req: Request) {
  try {
    const cliente = await getCurrentCliente();
    if (!cliente) {
      console.warn('[cadastrar-senha] sem sessão de cliente — cookie inválido ou ausente');
      return NextResponse.json(
        { error: 'Sessão expirada. Escaneie o QR do recibo de novo.' },
        { status: 401 },
      );
    }
    const body = (await req.json().catch(() => null)) as { senha?: string } | null;
    if (!body?.senha) {
      return NextResponse.json({ error: 'Senha obrigatória.' }, { status: 400 });
    }
    await cadastrarSenha(cliente.id, body.senha);
    console.log('[cadastrar-senha] ok cliente:', cliente.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[cadastrar-senha] erro:', e);
    return NextResponse.json(
      { error: (e as Error).message || 'Erro ao salvar senha.' },
      { status: 400 },
    );
  }
}
