import { redirect } from 'next/navigation';
import { loginViaToken } from '@/lib/cliente-auth';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ClienteTokenPage({ params }: Props) {
  const { token } = await params;
  const cliente = await loginViaToken(token);
  if (!cliente) {
    redirect('/cliente?invalido=1');
  }
  redirect('/cliente');
}
