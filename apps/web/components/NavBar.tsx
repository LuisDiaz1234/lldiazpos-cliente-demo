'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RoleGate } from '@/components/RoleGate';

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
  return (
    <Link
      href={href}
      className={[
        'px-3 py-2 rounded-xl text-sm',
        active ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'
      ].join(' ')}
    >
      {children}
    </Link>
  );
}

export default function NavBar() {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold">LLdiazProduction</Link>

        <nav className="flex items-center gap-1">
          {/* Visibles para ambos (admin y cajero) */}
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/pos">POS</NavLink>
          <NavLink href="/caja">Caja</NavLink>
          <NavLink href="/facturas">Facturas</NavLink>
          <NavLink href="/reportes">Reportes</NavLink>

          {/* Solo ADMIN */}
          <RoleGate allow={['admin']}>
            <NavLink href="/inventario">Inventario</NavLink>
            <NavLink href="/compras">Compras</NavLink>
            <NavLink href="/configuracion">Configuración</NavLink>
            <NavLink href="/configuracion/usuarios">Usuarios</NavLink>
          </RoleGate>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/auth/logout" className="px-3 py-2 rounded-xl text-sm hover:bg-gray-50">
            Salir
          </Link>
        </div>
      </div>
    </header>
  );
}
