import { NextResponse } from 'next/server';
import { removeTagFromCliente } from '@/lib/tags';

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; tagId: string }> },
) {
  const { id, tagId } = await ctx.params;
  const idNum = Number(id);
  const tagIdNum = Number(tagId);
  if (!Number.isFinite(idNum) || !Number.isFinite(tagIdNum)) {
    return NextResponse.json({ error: 'IDs inválidos.' }, { status: 400 });
  }
  await removeTagFromCliente(idNum, tagIdNum);
  return NextResponse.json({ ok: true });
}
