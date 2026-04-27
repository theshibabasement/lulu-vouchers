import { NextResponse } from 'next/server';
import { createTag, listTags, type TagCor } from '@/lib/tags';

const VALID: TagCor[] = ['magenta', 'cyan', 'yellow', 'purple', 'mint', 'cheek', 'ink'];

export async function GET() {
  const tags = await listTags();
  return NextResponse.json({ tags });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { nome?: string; cor?: TagCor } | null;
  if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  const cor: TagCor = body.cor && VALID.includes(body.cor) ? body.cor : 'magenta';
  try {
    const tag = await createTag(body.nome ?? '', cor);
    return NextResponse.json({ tag }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
