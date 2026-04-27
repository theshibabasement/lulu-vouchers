import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/health',
  // Cliente portal — auth próprio (cookie diferente)
  '/cliente',
  '/api/cliente',
  // Agendamento público
  '/agendar',
  '/api/agendar',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const cookie = req.cookies.get('lulu_session');
  if (!cookie?.value) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
