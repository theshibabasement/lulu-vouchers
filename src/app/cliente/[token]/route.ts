import { NextResponse, type NextRequest } from 'next/server';
import { loginViaToken } from '@/lib/cliente-auth';

/**
 * Deep link do QR code. Recebe token, autentica cliente e redireciona.
 *
 * Implementado como Route Handler (não Server Component) porque escrita
 * de cookie só é permitida em Route Handler ou Server Action no Next 16.
 */

/**
 * Resolve a URL pública correta — atrás de proxy reverso (Traefik/Dokploy)
 * o Next vê host interno (ex: 0.0.0.0:3000). Headers x-forwarded-*
 * dão a URL real que o cliente acessou.
 */
function externalBase(req: NextRequest): string {
  const fromEnv = process.env.PORTAL_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const proto =
    req.headers.get('x-forwarded-proto') ||
    req.nextUrl.protocol.replace(':', '') ||
    'https';
  const host =
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    req.nextUrl.host;
  return `${proto}://${host}`;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const base = externalBase(req);

  const cliente = await loginViaToken(token).catch((e) => {
    console.error('[cliente/token] loginViaToken falhou', e);
    return null;
  });

  if (!cliente) {
    return NextResponse.redirect(new URL('/cliente?invalido=1', base));
  }
  return NextResponse.redirect(new URL('/cliente', base));
}
