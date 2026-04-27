import { NextResponse } from 'next/server';
import { deleteAvaliacao, getAvaliacao, updateAvaliacao } from '@/lib/avaliacoes';
import type { AvaliacaoStatus } from '@/lib/types';

const STATUS_VALIDOS: AvaliacaoStatus[] = [
  'pendente', 'confirmada', 'realizada', 'cancelada', 'no_show',
];

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  const a = await getAvaliacao(idNum);
  if (!a) return NextResponse.json({ error: 'Não encontrada.' }, { status: 404 });
  return NextResponse.json({ avaliacao: a });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  const body = (await req.json().catch(() => null)) as
    | {
        status?: string;
        dataHora?: string;
        valeId?: string | null;
        observacoes?: string | null;
        qtdPecas?: number | null;
        tamanhos?: string[];
      }
    | null;
  if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  if (body.status && !STATUS_VALIDOS.includes(body.status as AvaliacaoStatus)) {
    return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
  }
  try {
    const a = await updateAvaliacao(idNum, {
      status: body.status as AvaliacaoStatus | undefined,
      dataHora: body.dataHora,
      valeId: body.valeId,
      observacoes: body.observacoes,
      qtdPecas: body.qtdPecas,
      tamanhos: body.tamanhos,
    });
    return NextResponse.json({ avaliacao: a });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  try {
    await deleteAvaliacao(idNum);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
