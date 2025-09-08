// apps/web/app/(pos)/pos/pos-client.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type Producto = {
  id: string;
  nombre: string;
  precio: number;
  activo: boolean;
  es_insumo: boolean;
};

type ItemCarrito = {
  product_id: string;
  nombre: string;
  cantidad: number;
  precio_unit: number;
  itbms_rate: number;
  descuento: number;
};

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

export default function POSClient() {
  const supabase = createClient();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [jubilado, setJubilado] = useState(false);
  const [descJubiladoPct, setDescJubiladoPct] = useState<number>(0);

  // Cargar productos vendibles + % jubilado de la empresa
  useEffect(() => {
    (async () => {
      try {
        const [{ data: prods }, { data: cfg }] = await Promise.all([
          supabase
            .from('products')
            .select('id,nombre,precio,activo,es_insumo')
            .eq('activo', true)
            .limit(200),
          supabase
            .from('companies')
            .select('descuento_jubilado')
            .eq('id', COMPANY_ID)
            .single(),
        ]);

        const vendibles = (prods || []).filter((p: any) => p.es_insumo !== true);
        setProductos(vendibles);
        setDescJubiladoPct(Number(cfg?.descuento_jubilado || 0));
      } catch (e) {
        console.error(e);
        alert('No pudimos cargar productos. Revisa Supabase.');
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  // Helpers carrito
  const add = (p: Producto) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.product_id === p.id);
      if (i > -1) {
        const cp = [...prev];
        cp[i].cantidad += 1;
        return cp;
      }
      return [
        ...prev,
        {
          product_id: p.id,
          nombre: p.nombre,
          cantidad: 1,
          precio_unit: Number(p.precio),
          itbms_rate: 0.07,
          descuento: 0,
        },
      ];
    });
  };

  const dec = (id: string) =>
    setItems((prev) =>
      prev
        .map((it) =>
          it.product_id === id ? { ...it, cantidad: Math.max(1, it.cantidad - 1) } : it
        )
        .filter(Boolean as any)
    );

  const inc = (id: string) =>
    setItems((prev) =>
      prev.map((it) => (it.product_id === id ? { ...it, cantidad: it.cantidad + 1 } : it))
    );

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((it) => it.product_id !== id));

  const clear = () => setItems([]);

  // Totales (mismos criterios que el backend)
  const { subtotal, itbms, descJub, totalVisual } = useMemo(() => {
    const sub = items.reduce((s, it) => s + it.cantidad * it.precio_unit, 0);
    const itb = items.reduce(
      (s, it) => s + (it.cantidad * it.precio_unit - it.descuento) * it.itbms_rate,
      0
    );
    const dj = jubilado ? Math.round((sub * descJubiladoPct) / 100 * 100) / 100 : 0;
    const tot = sub - dj + itb;
    return { subtotal: sub, itbms: itb, descJub: dj, totalVisual: tot };
  }, [items, jubilado, descJubiladoPct]);

  // Cobro
  async function cobrar() {
    if (items.length === 0) {
      alert('Agrega productos al carrito.');
      return;
    }
    const payload = {
      p_company: COMPANY_ID,
      p_branch: BRANCH_ID,
      p_customer: null,
      p_items: items,
      p_pagos: [{ metodo: 'efectivo', monto: totalVisual }],
      p_desc_jubilado: jubilado ? descJubiladoPct : 0,
      p_session: null, // el backend abrirá caja si está null
    };

    try {
      const res = await fetch('/api/ventas/procesar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const txt = await res.text();
      if (!res.ok) {
        throw new Error(txt);
      }
      // si el response es JSON { sale_id }
      try {
        const { sale_id } = JSON.parse(txt);
        alert('Venta OK: ' + sale_id);
      } catch {
        // o si llegó como texto crudo desde el endpoint
        alert('Venta OK: ' + txt);
      }
      clear();
    } catch (err: any) {
      console.error(err);
      alert('Error al procesar: ' + err.message);
    }
  }

  if (loading) return <div>Cargando…</div>;

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Productos */}
      <div className="col-span-12 lg:col-span-8">
        {productos.length === 0 && (
          <div className="text-sm text-gray-500">No hay productos vendibles aún.</div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {productos.map((p) => (
            <button
              key={p.id}
              onClick={() => add(p)}
              className="rounded-2xl border p-3 text-left hover:shadow transition"
            >
              <div className="aspect-square rounded-xl bg-gray-50 mb-2" />
              <div className="font-medium">{p.nombre}</div>
              <div className="text-sm text-gray-500">$ {Number(p.precio).toFixed(2)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Carrito */}
      <div className="col-span-12 lg:col-span-4">
        <div className="rounded-2xl border p-4 lg:sticky lg:top-24 bg-white">
          <h2 className="font-semibold mb-3">Carrito</h2>

          <div className="space-y-2 max-h-[48vh] overflow-auto pr-1">
            {items.map((it) => (
              <div key={it.product_id} className="flex justify-between items-center border-b pb-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.nombre}</div>
                  <div className="text-xs text-gray-500">x{it.cantidad}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => dec(it.product_id)}
                    className="px-2 py-1 border rounded-xl"
                    aria-label="Restar"
                  >
                    -
                  </button>
                  <button
                    onClick={() => inc(it.product_id)}
                    className="px-2 py-1 border rounded-xl"
                    aria-label="Sumar"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeItem(it.product_id)}
                    className="px-2 py-1 border rounded-xl"
                    aria-label="Quitar"
                    title="Quitar"
                  >
                    ×
                  </button>
                  <div className="w-20 text-right">
                    $
                    {((it.cantidad * it.precio_unit - it.descuento) * (1 + it.itbms_rate)).toFixed(
                      2
                    )}
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="text-sm text-gray-500">Carrito vacío</div>}
          </div>

          {/* Jubilado */}
          <div className="flex items-center gap-2 mt-3">
            <input
              id="chkJub"
              type="checkbox"
              className="h-4 w-4"
              checked={jubilado}
              onChange={(e) => setJubilado(e.target.checked)}
            />
            <label htmlFor="chkJub" className="text-sm">
              Aplicar descuento Jubilado ({descJubiladoPct}%)
            </label>
          </div>

          {/* Totales */}
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {jubilado && (
              <div className="flex justify-between text-emerald-700">
                <span>Desc. Jubilado</span>
                <span>- ${descJub.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>ITBMS</span>
              <span>${itbms.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold pt-1">
              <span>Total</span>
              <span>${totalVisual.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={cobrar}
            disabled={items.length === 0}
            className="mt-4 w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2"
          >
            Cobrar
          </button>
        </div>
      </div>
    </div>
  );
}
