'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

type LotRow = {
  id: string; product_id: string; nombre: string; lote: string | null; vencimiento: string | null; cantidad: number; unit: string | null;
};

export default function InventarioPage(){
  const supabase = createClient();
  const [rows, setRows] = useState<LotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [delta, setDelta] = useState<string>('1');
  const [reason, setReason] = useState<string>('ajuste manual');

  async function load(){
    setLoading(true);
    const { data, error } = await supabase
      .from('stock_lots')
      .select('id, product_id, lote, vencimiento, cantidad, unit, products(nombre)')
      .eq('company_id', COMPANY_ID)
      .eq('branch_id', BRANCH_ID)
      .order('vencimiento', { ascending: true })
      .limit(500);

    if(error){ alert(error.message); setLoading(false); return; }

    const mapped: LotRow[] = (data||[]).map((r:any)=>({
      id: r.id, product_id: r.product_id, nombre: r.products?.nombre ?? '(?)',
      lote: r.lote, vencimiento: r.vencimiento, cantidad: Number(r.cantidad), unit: r.unit
    }));
    setRows(mapped);
    setLoading(false);
  }

  useEffect(()=>{ load(); },[]);

  async function ajustar(r: LotRow, sign: 1|-1){
    const p_delta = sign * Number(delta || '0');
    if(!p_delta) return;
    const res = await fetch('/api/inventario/ajustar', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        p_company: COMPANY_ID,
        p_branch: BRANCH_ID,
        p_product: r.product_id,
        p_lot: r.id,
        p_delta,
        p_reason: reason || 'ajuste manual'
      })
    });
    if(!res.ok){ alert(await res.text()); return; }
    await load();
  }

  if(loading) return <div>Cargando…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Inventario (lotes)</h1>

      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500">Cantidad</label>
          <input value={delta} onChange={e=>setDelta(e.target.value)} className="border rounded-xl px-3 py-2 w-32" />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500">Motivo</label>
          <input value={reason} onChange={e=>setReason(e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
        </div>
      </div>

      <div className="overflow-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Producto</th>
              <th className="text-left p-2">Lote</th>
              <th className="text-left p-2">Vence</th>
              <th className="text-right p-2">Cantidad</th>
              <th className="text-left p-2">Unidad</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.nombre}</td>
                <td className="p-2">{r.lote || '-'}</td>
                <td className="p-2">{r.vencimiento || '-'}</td>
                <td className="p-2 text-right">{r.cantidad}</td>
                <td className="p-2">{r.unit || '-'}</td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button onClick={()=>ajustar(r, +1)} className="px-3 py-1 border rounded-xl">+ Agregar</button>
                    <button onClick={()=>ajustar(r, -1)} className="px-3 py-1 border rounded-xl">- Quitar</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length===0 && <tr><td className="p-4 text-center text-gray-500" colSpan={6}>Sin lotes</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
