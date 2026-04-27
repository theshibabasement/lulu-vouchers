import { headers } from 'next/headers';
import { AppShell } from '@/components/AppShell';
import { listVales } from '@/lib/vales';

export const dynamic = 'force-dynamic';

async function resolvePortalBase(): Promise<string> {
  const fromEnv = process.env.PORTAL_BASE_URL || process.env.NEXT_PUBLIC_PORTAL_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const h = await headers();
  const proto = h.get('x-forwarded-proto') || 'https';
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export default async function Home() {
  const [vales, portalBase] = await Promise.all([
    listVales().catch((e) => {
      console.error('[home] listVales falhou', e);
      return [];
    }),
    resolvePortalBase(),
  ]);
  return <AppShell initialVales={vales} portalBase={portalBase} />;
}
