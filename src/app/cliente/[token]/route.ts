import { NextResponse, type NextRequest } from 'next/server';
import { loginViaToken } from '@/lib/cliente-auth';

/**
 * Deep link do QR code. Recebe token, autentica cliente e redireciona.
 *
 * Implementado como Route Handler (não Server Component) porque escrita
 * de cookie só é permitida em Route Handler ou Server Action no Next 16.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const origin = req.nextUrl.origin;

  const cliente = await loginViaToken(token).catch((e) => {
    console.error('[cliente/token] loginViaToken falhou', e);
    return null;
  });

  if (!cliente) {
    return NextResponse.redirect(new URL('/cliente?invalido=1', origin));
  }

  return NextResponse.redirect(new URL('/cliente', origin));
}
