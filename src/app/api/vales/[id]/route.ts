import { NextResponse } from 'next/server';
import { getVale, softDeleteVale, restoreVale } from '@/lib/vales';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const vale = await getVale(id);
  if (!vale) return NextResponse.json({ error: 'Vale não encontrado.' }, { status: 404 });
  return NextResponse.json({ vale });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    await softDeleteVale(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { action?: string } | null;
  if (body?.action === 'restore') {
    try {
      await restoreVale(id);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }
  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
}
