'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

type Lote = {
  id: string; product_id: string; productos?: { nombre: string };
  lote: string | null; vencimiento: string | null;
  cantidad: number; unit: string | null;
};

export default function InventarioPage() {
  const supabase = createClient();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [q, setQ] = useState('');
  const [cant, setCant] = useState(1);
  const [motivo, setMotivo] = useState('ajuste manual');
  const [msg, setMsg] = useState<string>();

  async function cargar() {
    // trae lotes con join a producto (si definiste FK products.id => stock_lots.product_id, Supabase permite "products(nombre)")
    const { data, error } = await supabase
      .from('stock_lots')
      .select('id, product_id, lote, vencimiento, cantidad, unit, products(nombre)')
      .eq('company_id', COMPANY_ID)
      .eq('branch_id', BRANCH_ID)
      .order('vencimiento', { ascending: true });
    if (!error && data) setLotes(data as any);
  }
  useEffect(() => { cargar(); }, []);

  const filtered = lotes.filter(l =>
    (l.productos?.nombre || '').toLowerCase().includes(q.toLowerCase()) ||
    (l.lote || '').toLowerCase().includes(q.toLowerCase())
  );

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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Inventario (lotes)</h1>

      <div className="flex gap-3 items-center">
        <input className="border rounded-xl px-3 py-2 w-64" placeholder="Buscar producto o lote…" value={q} onChange={e=>setQ(e.target.value)} />
        <input type="number" className="border rounded-xl px-3 py-2 w-24 text-right" value={cant} onChange={e=>setCant(Number(e.target.value||0))} />
        <input className="border rounded-xl px-3 py-2 w-64" placeholder="Motivo" value={motivo} onChange={e=>setMotivo(e.target.value)} />
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
            {filtered.length === 0 && (
              <tr><td className="p-4 text-center text-gray-500" colSpan={6}>Sin lotes</td></tr>
            )}
            {filtered.map(l => (
              <tr key={l.id} className="border-t">
                <td className="p-2">{l.productos?.nombre || l.product_id}</td>
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
