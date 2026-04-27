import { NextResponse } from 'next/server';
import { mesclarClientes } from '@/lib/clientes';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const sourceId = Number(id);
  if (!Number.isFinite(sourceId)) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as { targetId?: number } | null;
  if (!body?.targetId) return NextResponse.json({ error: 'targetId obrigatório.' }, { status: 400 });
  try {
    await mesclarClientes(sourceId, Number(body.targetId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
