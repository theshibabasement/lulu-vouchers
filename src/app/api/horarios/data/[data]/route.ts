import { NextResponse } from 'next/server';
import { deleteData, setData, validateJanelas } from '@/lib/horarios';

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ data: string }> },
) {
  const { data } = await ctx.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ error: 'Data inválida (YYYY-MM-DD).' }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as { janelas?: unknown } | null;
  if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  try {
    const janelas = validateJanelas(body.janelas);
    const config = await setData(data, janelas);
    return NextResponse.json({ config });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ data: string }> },
) {
  const { data } = await ctx.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
  }
  await deleteData(data);
  return NextResponse.json({ ok: true });
}
