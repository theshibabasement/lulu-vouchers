import { NextResponse } from 'next/server';
import { listClientesComAgregados, upsertCliente } from '@/lib/clientes';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const includeDeleted = url.searchParams.get('includeDeleted') === '1';
  const clientes = await listClientesComAgregados({ includeDeleted });
  return NextResponse.json({ clientes });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        cpf?: string;
        nome?: string;
        whatsapp?: string;
        email?: string;
        instagram?: string;
        endereco?: string;
        cidade?: string;
        observacoes?: string;
      }
    | null;
  if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  try {
    const cliente = await upsertCliente({
      cpf: body.cpf ?? '',
      nome: body.nome ?? '',
      whatsapp: body.whatsapp,
      email: body.email,
      instagram: body.instagram,
      endereco: body.endereco,
      cidade: body.cidade,
      observacoes: body.observacoes,
    });
    return NextResponse.json({ cliente }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
