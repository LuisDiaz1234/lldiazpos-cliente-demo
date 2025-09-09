import Link from 'next/link';
import { getSessionAndRole } from '@/lib/auth-server';

export default async function AppHeader() {
  const { session, role } = await getSessionAndRole();
  return (
    <header className="w-full border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Link href="/" className="font-semibold">LLdiazProduction</Link>
        {session && (
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/pos">POS</Link>
            <Link href="/inventario">Inventario</Link>
            <Link href="/compras">Compras</Link>
            <Link href="/caja">Caja</Link>
            <Link href="/facturas">Facturas</Link>
            <Link href="/reportes">Reportes</Link>
            {role === 'admin' && (<><Link href="/configuracion">Configuración</Link><Link href="/usuarios">Usuarios</Link></>)}
          </nav>
        )}
        <div className="ml-auto">
          {session ? (
            <form action="/auth/logout" method="post"><button className="text-sm underline">Salir</button></form>
          ) : (
            <Link href="/login" className="text-sm underline">Ingresar</Link>
          )}
        </div>
      </div>
    </header>
  );
}
