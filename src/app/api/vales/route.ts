import { NextResponse } from 'next/server';
import { listVales, createVale } from '@/lib/vales';

export async function GET() {
  const vales = await listVales();
  return NextResponse.json({ vales });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { nome?: string; cpf?: string; valor?: number }
    | null;
  if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  try {
    const vale = await createVale({
      nome: body.nome ?? '',
      cpf: body.cpf ?? '',
      valor: Number(body.valor) || 0,
    });
    return NextResponse.json({ vale }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
