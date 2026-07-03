import { NextResponse } from 'next/server';
import { getVenda, cancelarVenda } from '@/lib/vendas';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const venda = await getVenda(Number(id));
  if (!venda) return NextResponse.json({ error: 'Venda não encontrada.' }, { status: 404 });
  return NextResponse.json({ venda });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const venda = await cancelarVenda(Number(id));
    return NextResponse.json({ venda });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
