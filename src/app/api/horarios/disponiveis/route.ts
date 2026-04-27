import { NextResponse } from 'next/server';
import { getJanelasParaData } from '@/lib/horarios';

/**
 * Endpoint público — usado pelo /agendar pra popular os slots disponíveis
 * conforme a data escolhida.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const data = url.searchParams.get('data') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
  }
  const janelas = await getJanelasParaData(data);
  return NextResponse.json({ janelas });
}
