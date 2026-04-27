import { getCurrentCliente } from '@/lib/cliente-auth';
import { AgendarForm } from '@/components/cliente/AgendarForm';

export const dynamic = 'force-dynamic';

export default async function AgendarPage() {
  const cliente = await getCurrentCliente();
  return (
    <AgendarForm
      autenticado={!!cliente}
      nomePadrao={cliente?.nome}
      cpfPadrao={cliente?.cpf}
      whatsappPadrao={cliente?.whatsapp ?? undefined}
    />
  );
}
