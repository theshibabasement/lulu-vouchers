import { NextResponse } from 'next/server';
import { createAvaliacaoFull } from '@/lib/avaliacoes';

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
    const result = await createAvaliacaoFull({
      nome: body.nome ?? '',
      cpf: body.cpf,
      whatsapp: body.whatsapp,
      dataHora: body.dataHora ?? '',
      qtdPecas: body.qtdPecas,
      tamanhos: body.tamanhos,
      observacoes: body.observacoes,
    });
    // Só expõe portalToken se o cliente foi criado AGORA por esse agendamento.
    // Pra cliente que já existia, não revelamos token (segurança).
    const portalToken =
      result.clienteCriado && result.cliente ? result.cliente.portalToken : null;
    return NextResponse.json(
      {
        avaliacao: result.avaliacao,
        clienteCriado: result.clienteCriado,
        clienteJaExistia: !!result.cliente && !result.clienteCriado,
        portalToken,
      },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
