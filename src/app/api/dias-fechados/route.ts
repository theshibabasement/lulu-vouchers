import { NextResponse } from 'next/server';
import { addDiaFechado, listDiasFechados } from '@/lib/dias-fechados';

export async function GET() {
  const dias = await listDiasFechados();
  return NextResponse.json({ dias });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { data?: string; motivo?: string } | null;
  if (!body?.data) return NextResponse.json({ error: 'data obrigatória.' }, { status: 400 });
  // valida YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.data)) {
    return NextResponse.json({ error: 'Data inválida (use YYYY-MM-DD).' }, { status: 400 });
  }
  const dia = await addDiaFechado(body.data, body.motivo);
  return NextResponse.json({ dia }, { status: 201 });
}
