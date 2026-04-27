import { NextResponse } from 'next/server';
import { listAvaliacoes } from '@/lib/avaliacoes';
import type { AvaliacaoStatus } from '@/lib/types';

const STATUS_VALIDOS: AvaliacaoStatus[] = [
  'pendente', 'confirmada', 'realizada', 'cancelada', 'no_show',
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const statusParam = url.searchParams.getAll('status');
  const status = statusParam.filter((s): s is AvaliacaoStatus =>
    STATUS_VALIDOS.includes(s as AvaliacaoStatus),
  );
  const desde = url.searchParams.get('desde') ?? undefined;
  const ate = url.searchParams.get('ate') ?? undefined;
  const avaliacoes = await listAvaliacoes({
    status: status.length ? status : undefined,
    desde,
    ate,
  });
  return NextResponse.json({ avaliacoes });
}
