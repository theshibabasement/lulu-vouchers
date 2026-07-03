import { NextResponse } from 'next/server';
import {
  getCliente,
  getClienteVales,
  restoreCliente,
  softDeleteCliente,
  updateCliente,
} from '@/lib/clientes';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }
  const cliente = await getCliente(idNum);
  if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
  const vales = await getClienteVales(idNum);
  return NextResponse.json({ cliente, vales });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as
    | {
        action?: string;
        nome?: string;
        whatsapp?: string | null;
        email?: string | null;
        instagram?: string | null;
        endereco?: string | null;
        cidade?: string | null;
        observacoes?: string | null;
      }
    | null;
  if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  if (body.action === 'restore') {
    try {
      await restoreCliente(idNum);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }
  try {
    const cliente = await updateCliente(idNum, body);
    return NextResponse.json({ cliente });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }
  try {
    await softDeleteCliente(idNum);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
