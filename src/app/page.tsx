import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Raiz pública — redireciona pra portal do cliente.
 * Admin acessa explicitamente em /admin.
 */
export default function RootPage() {
  redirect('/cliente');
}
