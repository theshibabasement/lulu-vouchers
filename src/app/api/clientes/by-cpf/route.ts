import { NextResponse } from 'next/server';
import { getClienteByCpf } from '@/lib/clientes';
import { isValidCPF } from '@/lib/format';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cpf = url.searchParams.get('cpf') ?? '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11 || !isValidCPF(digits)) {
    return NextResponse.json({ cliente: null }, { status: 200 });
  }
  const cliente = await getClienteByCpf(digits);
  return NextResponse.json({ cliente });
}
