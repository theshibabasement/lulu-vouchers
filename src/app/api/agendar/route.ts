import { NextResponse } from 'next/server';
import { createAvaliacao } from '@/lib/avaliacoes';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        nome?: string;
        cpf?: string;
        whatsapp?: string;
        dataHora?: string;
        qtdPecas?: number;
        tamanhos?: string[];
        observacoes?: string;
      }
    | null;
  if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  try {
    const a = await createAvaliacao({
      nome: body.nome ?? '',
      cpf: body.cpf,
      whatsapp: body.whatsapp,
      dataHora: body.dataHora ?? '',
      qtdPecas: body.qtdPecas,
      tamanhos: body.tamanhos,
      observacoes: body.observacoes,
    });
    return NextResponse.json({ avaliacao: a }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
