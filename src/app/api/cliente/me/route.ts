import { NextResponse } from 'next/server';
import { getCurrentCliente } from '@/lib/cliente-auth';
import { getClienteVales } from '@/lib/clientes';
import { listAvaliacoes } from '@/lib/avaliacoes';

export async function GET() {
  const cliente = await getCurrentCliente();
  if (!cliente) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  const [vales, avaliacoes] = await Promise.all([
    getClienteVales(cliente.id),
    listAvaliacoes({ clienteId: cliente.id }),
  ]);
  return NextResponse.json({ cliente, vales, avaliacoes });
}
