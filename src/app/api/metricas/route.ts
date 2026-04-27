import { NextResponse } from 'next/server';
import { getDashboard, type PeriodoTop } from '@/lib/metricas';

const VALID: PeriodoTop[] = ['mes', '12m', 'total'];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get('topPeriodo') ?? 'total';
  const periodo = (VALID.includes(raw as PeriodoTop) ? raw : 'total') as PeriodoTop;
  const data = await getDashboard(periodo);
  return NextResponse.json(data);
}
