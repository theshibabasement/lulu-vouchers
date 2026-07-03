import { NextResponse } from 'next/server';
import { marcarRetirada } from '@/lib/vendas';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const venda = await marcarRetirada(Number(id));
    return NextResponse.json({ venda });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
