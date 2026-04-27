import { NextResponse, type NextRequest } from 'next/server';

/**
 * Paths totalmente públicos (sem nenhum gate).
 */
const PUBLIC_EXACT = new Set<string>([
  '/',
  '/agendar',
  '/api/agendar',
  '/api/health',
  '/admin/login',
  '/api/auth/login',
  '/api/horarios/disponiveis',
]);

/**
 * Prefixos públicos. Qualquer rota sob esses paths não exige cookie admin.
 * Auth do cliente é tratada dentro das próprias rotas (cookie diferente).
 */
const PUBLIC_PREFIXES = [
  '/cliente',
  '/api/cliente',
  '/_next',
  '/favicon',
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  // Tudo o resto (ex: /admin, /api/vales, /api/clientes, /api/avaliacoes,
  // /api/auth/logout) exige cookie admin.
  const cookie = req.cookies.get('lulu_session');
  if (!cookie?.value) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
