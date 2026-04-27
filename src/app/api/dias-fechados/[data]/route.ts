import { NextResponse } from 'next/server';
import { removeDiaFechado } from '@/lib/dias-fechados';

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ data: string }> },
) {
  const { data } = await ctx.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
  }
  await removeDiaFechado(data);
  return NextResponse.json({ ok: true });
}
