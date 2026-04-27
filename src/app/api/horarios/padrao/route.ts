import { NextResponse } from 'next/server';
import { setPadrao, validateJanelas } from '@/lib/horarios';

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => null)) as { janelas?: unknown } | null;
  if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  try {
    const janelas = validateJanelas(body.janelas);
    const config = await setPadrao(janelas);
    return NextResponse.json({ config });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
