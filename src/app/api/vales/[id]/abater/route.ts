import { NextResponse } from 'next/server';
import { abaterVale } from '@/lib/vales';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { valor?: number; obs?: string }
    | null;
  if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  try {
    const vale = await abaterVale(id, Number(body.valor) || 0, body.obs);
    return NextResponse.json({ vale });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
