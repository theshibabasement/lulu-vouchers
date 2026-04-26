import { NextResponse } from 'next/server';
import { getVale } from '@/lib/vales';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const vale = await getVale(id);
  if (!vale) return NextResponse.json({ error: 'Vale não encontrado.' }, { status: 404 });
  return NextResponse.json({ vale });
}
