import { NextResponse } from 'next/server';
import { pingDb } from '@/lib/db';

export async function GET() {
  const db = await pingDb();
  return NextResponse.json(
    { status: db ? 'ok' : 'degraded', db },
    { status: db ? 200 : 200 }, // 200 mesmo com fallback — app ainda atende
  );
}
