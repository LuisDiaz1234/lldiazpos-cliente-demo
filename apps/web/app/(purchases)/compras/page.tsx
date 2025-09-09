'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

type Producto = { id: string; nombre: string; es_insumo: boolean; activo: boolean; unidad?: string };

export default function ComprasPage() {
  const supabase = createClient();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [motivo, setMotivo] = useState('compra');
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState<string>();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id,nombre,es_insumo,activo')
        .eq('company_id', COMPANY_ID)
        .order('nombre');
      if (!error && data) setProductos(data);
    })();
  }, []);

  function addRow() {
    setItems((arr) => [...arr, { product_id: '', cantidad: 1, unidad: 'unidad', costo: 0, lote: '', vence: '' }]);
  }
  function delRow(i: number) {
    setItems((arr) => arr.filter((_, idx) => idx !== i));
  }
  function setField(i: number, k: string, v: any) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  }

  async function guardar() {
    setMsg(undefined);
    setCargando(true);
    try {
      // validación mínima
      const clean = items
        .map((it) => ({
          product_id: it.product_id,
          cantidad: Number(it.cantidad || 0),
          unidad: it.unidad || 'unidad',
          costo: Number(it.costo || 0),
          lote: it.lote || null,
          vence: it.vence || null
        }))
        .filter((x) => x.product_id && x.cantidad > 0);

      if (clean.length === 0) { setMsg('Agrega al menos 1 item'); return; }

      const res = await fetch('/api/compras/ingresar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: clean, motivo })
      });
      const txt = await res.text();
      if (!res.ok) { setMsg(txt); return; }

      setMsg('Compra registrada. Lotes ingresados.');
      setItems([]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Compras (ingreso por lotes)</h1>

      <div className="flex gap-3">
        <button onClick={addRow} className="px-3 py-2 rounded-xl border bg-white">+ Agregar ítem</button>
        <input className="border rounded-xl px-3 py-2 w-64" placeholder="Motivo" value={motivo} onChange={e=>setMotivo(e.target.value)} />
        <div className="flex-1" />
        <button onClick={guardar} disabled={cargando} className="px-4 py-2 rounded-xl border bg-white">
          {cargando ? 'Guardando…' : 'Guardar compra'}
        </button>
      </div>

      <div className="rounded-2xl border overflow-x-auto bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Producto</th>
              <th className="p-2">Cantidad</th>
              <th className="p-2">Unidad</th>
              <th className="p-2">Costo (opcional)</th>
              <th className="p-2">Lote</th>
              <th className="p-2">Vence</th>
              <th className="p-2">Quitar</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td className="p-4 text-center text-gray-500" colSpan={7}>Sin ítems</td></tr>
            )}
            {items.map((it, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">
                  <select className="border rounded-xl px-2 py-1 w-64" value={it.product_id} onChange={e=>setField(i,'product_id', e.target.value)}>
                    <option value="">— seleccionar —</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2 text-center">
                  <input type="number" min={0} className="border rounded-xl px-2 py-1 w-24 text-right"
                         value={it.cantidad} onChange={e=>setField(i,'cantidad', e.target.value)} />
                </td>
                <td className="p-2 text-center">
                  <input className="border rounded-xl px-2 py-1 w-24 text-center"
                         value={it.unidad} onChange={e=>setField(i,'unidad', e.target.value)} />
                </td>
                <td className="p-2 text-center">
                  <input type="number" min={0} step="0.01" className="border rounded-xl px-2 py-1 w-28 text-right"
                         value={it.costo} onChange={e=>setField(i,'costo', e.target.value)} />
                </td>
                <td className="p-2 text-center">
                  <input className="border rounded-xl px-2 py-1 w-28 text-center"
                         value={it.lote} onChange={e=>setField(i,'lote', e.target.value)} />
                </td>
                <td className="p-2 text-center">
                  <input type="date" className="border rounded-xl px-2 py-1"
                         value={it.vence} onChange={e=>setField(i,'vence', e.target.value)} />
                </td>
                <td className="p-2 text-center">
                  <button onClick={()=>delRow(i)} className="px-2 py-1 rounded-lg border">Quitar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {msg && <div className="text-sm">{msg}</div>}
    </div>
  );
}
