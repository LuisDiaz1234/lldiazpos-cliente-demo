'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import AddProductButton from '@/components/AddProductButton';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

type Lote = {
  id: string; product_id: string; products?: { nombre: string };
  lote: string | null; vencimiento: string | null;
  cantidad: number; unit: string | null;
};
type Producto = { id: string; nombre: string; activo: boolean };

export default function InventarioPage() {
  const supabase = createClient();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [q, setQ] = useState('');
  const [cant, setCant] = useState(1);
  const [motivo, setMotivo] = useState('ajuste manual');
  const [msg, setMsg] = useState<string>();
  const [reloadTick, setReloadTick] = useState(0);

  // form de ingreso directo
  const [newLot, setNewLot] = useState({
    product_id:'', cantidad:1, unidad:'unidad', lote:'', vence:'', motivo:'ingreso directo'
  });

  async function cargar() {
    const { data: l } = await supabase
      .from('stock_lots')
      .select('id, product_id, lote, vencimiento, cantidad, unit, products(nombre)')
      .eq('company_id', COMPANY_ID).eq('branch_id', BRANCH_ID)
      .order('vencimiento', { ascending: true });
    setLotes(l as any || []);
  }
  async function cargarProductos() {
    const { data: p } = await supabase
      .from('products')
      .select('id,nombre,activo')
      .eq('company_id', COMPANY_ID).eq('activo', true)
      .order('nombre');
    setProductos(p || []);
  }

  useEffect(() => { cargar(); cargarProductos(); }, [reloadTick]);

  const filtered = lotes.filter(l =>
    (l.products?.nombre || '').toLowerCase().includes(q.toLowerCase()) ||
    (l.lote || '').toLowerCase().includes(q.toLowerCase())
  );

  function reloadAll(){ setReloadTick(x=>x+1); }

  async function ajustar(lot_id: string, delta: number) {
    setMsg(undefined);
    const res = await fetch('/api/inventario/ajuste', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ lot_id, delta, motivo })
    });
    const txt = await res.text();
    if (!res.ok) { setMsg(txt); return; }
    await cargar();
  }

  async function ingresar() {
    setMsg(undefined);
    if (!newLot.product_id || !newLot.cantidad) { setMsg('Selecciona producto y cantidad'); return; }
    const res = await fetch('/api/inventario/ingresar', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        product_id: newLot.product_id,
        cantidad  : Number(newLot.cantidad),
        unidad    : newLot.unidad,
        lote      : newLot.lote || null,
        vence     : newLot.vence || null,
        motivo    : newLot.motivo || 'ingreso directo'
      })
    });
    const txt = await res.text();
    if (!res.ok) { setMsg(txt); return; }
    setNewLot({ product_id:'', cantidad:1, unidad:'unidad', lote:'', vence:'', motivo:'ingreso directo' });
    await cargar();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Inventario (lotes)</h1>
        {/* Crear producto sin salir del inventario */}
        <AddProductButton onCreated={reloadAll} />
      </div>

      {/* Ingreso directo */}
      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <div className="font-medium">Agregar inventario</div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <select className="border rounded-xl px-2 py-2"
            value={newLot.product_id}
            onChange={e=>setNewLot(v=>({ ...v, product_id: e.target.value }))}>
            <option value="">— producto —</option>
            {productos.map(p=> <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <input type="number" min={0} className="border rounded-xl px-2 py-2"
            value={newLot.cantidad} onChange={e=>setNewLot(v=>({ ...v, cantidad: Number(e.target.value||0) }))} />
          <select className="border rounded-xl px-2 py-2"
            value={newLot.unidad} onChange={e=>setNewLot(v=>({ ...v, unidad: e.target.value }))}>
            <option value="unidad">unidad</option><option value="gr">gr</option><option value="kg">kg</option>
            <option value="ml">ml</option><option value="l">l</option><option value="pieza">pieza</option>
          </select>
          <input className="border rounded-xl px-2 py-2" placeholder="Lote"
            value={newLot.lote} onChange={e=>setNewLot(v=>({ ...v, lote: e.target.value }))} />
          <input type="date" className="border rounded-xl px-2 py-2"
            value={newLot.vence} onChange={e=>setNewLot(v=>({ ...v, vence: e.target.value }))} />
          <button onClick={ingresar} className="px-3 py-2 rounded-xl border bg-white">Guardar</button>
        </div>
      </div>

      {/* Ajustes y lista */}
      <div className="flex gap-3 items-center">
        <input className="border rounded-xl px-3 py-2 w-64" placeholder="Buscar…"
               value={q} onChange={e=>setQ(e.target.value)} />
        <input type="number" className="border rounded-xl px-3 py-2 w-24 text-right"
               value={cant} onChange={e=>setCant(Number(e.target.value||0))} />
        <select className="border rounded-xl px-3 py-2 w-40" value={motivo} onChange={e=>setMotivo(e.target.value)}>
          <option value="ajuste manual">ajuste manual</option>
          <option value="merma">merma</option>
          <option value="rotura">rotura</option>
        </select>
      </div>

      <div className="rounded-2xl border overflow-x-auto bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Producto</th>
              <th className="p-2">Lote</th>
              <th className="p-2">Vence</th>
              <th className="p-2 text-right">Cantidad</th>
              <th className="p-2">Unidad</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td className="p-4 text-center text-gray-500" colSpan={6}>Sin lotes</td></tr>}
            {filtered.map(l => (
              <tr key={l.id} className="border-t">
                <td className="p-2">{l.products?.nombre || l.product_id}</td>
                <td className="p-2 text-center">{l.lote || '—'}</td>
                <td className="p-2 text-center">{l.vencimiento ? new Date(l.vencimiento).toLocaleDateString() : '—'}</td>
                <td className="p-2 text-right">{l.cantidad.toLocaleString()}</td>
                <td className="p-2 text-center">{l.unit || 'unidad'}</td>
                <td className="p-2 text-center">
                  <div className="flex gap-2 justify-center">
                    <button onClick={()=>ajustar(l.id, +Math.abs(cant))} className="px-2 py-1 rounded-lg border">+{cant}</button>
                    <button onClick={()=>ajustar(l.id, -Math.abs(cant))} className="px-2 py-1 rounded-lg border">-{cant}</button>
                  </div>
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
