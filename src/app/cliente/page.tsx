import { headers } from 'next/headers';
import { getCurrentCliente } from '@/lib/cliente-auth';
import { getClienteVales } from '@/lib/clientes';
import { listAvaliacoes } from '@/lib/avaliacoes';
import { PortalLanding } from '@/components/cliente/PortalLanding';
import { PortalDashboard } from '@/components/cliente/PortalDashboard';

export const dynamic = 'force-dynamic';

interface SP {
  invalido?: string;
}

async function resolvePortalBase(): Promise<string> {
  const fromEnv = process.env.PORTAL_BASE_URL || process.env.NEXT_PUBLIC_PORTAL_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const h = await headers();
  const proto = h.get('x-forwarded-proto') || 'https';
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export default async function ClientePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const cliente = await getCurrentCliente();
  const portalBase = await resolvePortalBase();

  if (!cliente) {
    return <PortalLanding tokenInvalido={sp.invalido === '1'} />;
  }

  const [vales, avaliacoes] = await Promise.all([
    getClienteVales(cliente.id),
    listAvaliacoes({ clienteId: cliente.id }),
  ]);

  return (
    <PortalDashboard
      cliente={cliente}
      vales={vales}
      avaliacoes={avaliacoes}
      portalBase={portalBase}
    />
  );
}
