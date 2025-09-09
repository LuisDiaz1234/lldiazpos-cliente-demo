import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PROTECTED_PREFIXES = [
  '/dashboard','/pos','/inventario','/compras','/caja',
  '/facturas','/reportes','/configuracion','/usuarios'
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => req.cookies.get(key)?.value,
        set: (key, value, options) => res.cookies.set({ name: key, value, ...options }),
        remove: (key, options) => res.cookies.set({ name: key, value: '', ...options })
      }
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return res;
}

export const config = {
  matcher: [
    '/dashboard/:path*','/pos/:path*','/inventario/:path*','/compras/:path*',
    '/caja/:path*','/facturas/:path*','/reportes/:path*','/configuracion/:path*','/usuarios/:path*'
  ]
};
