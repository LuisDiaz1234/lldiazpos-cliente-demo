import './globals.css';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white text-gray-900">
        <div className="min-h-screen flex flex-col">
          <header className="border-b bg-white/70 backdrop-blur sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-sky-500" />
                <span className="font-semibold">LLdiazProduction</span>
              </div>
              <nav className="hidden md:flex gap-4 text-sm">
                <a href="/dashboard">Dashboard</a>
                <a href="/pos">POS</a>
                <a href="/inventario">Inventario</a>
                <a href="/compras">Compras</a>
                <a href="/caja">Caja</a>
                <a href="/facturas">Facturas</a>
                <a href="/reportes">Reportes</a>
                <a href="/configuracion">Configuración</a>
              </nav>
            </div>
          </header>
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
