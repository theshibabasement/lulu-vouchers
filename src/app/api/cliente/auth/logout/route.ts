import { NextResponse } from 'next/server';
import { logoutCliente } from '@/lib/cliente-auth';

export async function POST() {
  await logoutCliente();
  return NextResponse.json({ ok: true });
}
