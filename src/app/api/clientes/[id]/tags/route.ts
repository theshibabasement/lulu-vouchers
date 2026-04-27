import { NextResponse } from 'next/server';
import { addTagToCliente, getTagsCliente } from '@/lib/tags';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }
  const tags = await getTagsCliente(idNum);
  return NextResponse.json({ tags });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as { tagId?: number } | null;
  if (!body?.tagId) return NextResponse.json({ error: 'tagId obrigatório.' }, { status: 400 });
  await addTagToCliente(idNum, Number(body.tagId));
  return NextResponse.json({ ok: true });
}
