import { AppShell } from '@/components/AppShell';
import { listVales } from '@/lib/vales';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const vales = await listVales().catch((e) => {
    console.error('[home] listVales falhou', e);
    return [];
  });
  return <AppShell initialVales={vales} />;
}
