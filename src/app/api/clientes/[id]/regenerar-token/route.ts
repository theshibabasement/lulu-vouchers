import { NextResponse } from 'next/server';
import { regenerarPortalToken } from '@/lib/clientes';

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }
  try {
    const cliente = await regenerarPortalToken(idNum);
    return NextResponse.json({ cliente });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
