import { NextResponse } from 'next/server';
import { listConfigsHorarios } from '@/lib/horarios';

export async function GET() {
  const configs = await listConfigsHorarios();
  return NextResponse.json({ configs });
}
