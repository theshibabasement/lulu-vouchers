import { NextResponse } from 'next/server';
import { getClienteByInstagram } from '@/lib/clientes';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const instagram = url.searchParams.get('instagram') ?? '';
  if (!instagram.trim()) return NextResponse.json({ cliente: null }, { status: 200 });
  const cliente = await getClienteByInstagram(instagram);
  return NextResponse.json({ cliente });
}
