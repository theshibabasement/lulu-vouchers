import { NextResponse } from 'next/server';
import { deleteSemanal, setSemanal, validateJanelas } from '@/lib/horarios';

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ dia: string }> },
) {
  const { dia } = await ctx.params;
  const d = parseInt(dia, 10);
  if (!Number.isFinite(d) || d < 0 || d > 6) {
    return NextResponse.json({ error: 'Dia da semana inválido (0..6).' }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as { janelas?: unknown } | null;
  if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  try {
    const janelas = validateJanelas(body.janelas);
    const config = await setSemanal(d, janelas);
    return NextResponse.json({ config });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ dia: string }> },
) {
  const { dia } = await ctx.params;
  const d = parseInt(dia, 10);
  if (!Number.isFinite(d) || d < 0 || d > 6) {
    return NextResponse.json({ error: 'Dia da semana inválido.' }, { status: 400 });
  }
  await deleteSemanal(d);
  return NextResponse.json({ ok: true });
}
