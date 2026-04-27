import { NextResponse } from 'next/server';
import { deleteTag, updateTag, type TagCor } from '@/lib/tags';

const VALID: TagCor[] = ['magenta', 'cyan', 'yellow', 'purple', 'mint', 'cheek', 'ink'];

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as { nome?: string; cor?: TagCor } | null;
  if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  const cor = body.cor && VALID.includes(body.cor) ? body.cor : undefined;
  try {
    const tag = await updateTag(idNum, { nome: body.nome, cor });
    return NextResponse.json({ tag });
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
  await deleteTag(idNum);
  return NextResponse.json({ ok: true });
}
