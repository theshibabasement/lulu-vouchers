import { NextResponse } from 'next/server';
import { getCurrentCliente } from '@/lib/cliente-auth';
import { createAvaliacao, listAvaliacoes } from '@/lib/avaliacoes';

export async function GET() {
  const cliente = await getCurrentCliente();
  if (!cliente) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  const avaliacoes = await listAvaliacoes({ clienteId: cliente.id });
  return NextResponse.json({ avaliacoes });
}

export async function POST(req: Request) {
  const cliente = await getCurrentCliente();
  if (!cliente) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as
    | { dataHora?: string; qtdPecas?: number; tamanhos?: string[]; observacoes?: string }
    | null;
  if (!body?.dataHora) return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
  try {
    const a = await createAvaliacao({
      clienteId: cliente.id,
      nome: cliente.nome,
      cpf: cliente.cpf,
      whatsapp: cliente.whatsapp ?? undefined,
      dataHora: body.dataHora,
      qtdPecas: body.qtdPecas,
      tamanhos: body.tamanhos,
      observacoes: body.observacoes,
    });
    return NextResponse.json({ avaliacao: a }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
