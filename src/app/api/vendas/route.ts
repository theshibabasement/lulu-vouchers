import { NextResponse } from 'next/server';
import { listVendas, createVenda } from '@/lib/vendas';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const includeCanceladas = url.searchParams.get('includeCanceladas') === '1';
  const vendas = await listVendas({ includeCanceladas });
  return NextResponse.json({ vendas });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    nome?: string;
    valor?: number;
    cpf?: string;
    whatsapp?: string;
    instagram?: string;
    observacoes?: string;
  } | null;
  if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  try {
    const venda = await createVenda({
      nome: body.nome ?? '',
      valor: Number(body.valor) || 0,
      cpf: body.cpf,
      whatsapp: body.whatsapp,
      instagram: body.instagram,
      observacoes: body.observacoes,
    });
    return NextResponse.json({ venda }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
