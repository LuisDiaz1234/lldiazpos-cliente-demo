'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import Link from 'next/link';

type GroupRow = { product_id:string; product_name:string; cantidad_total:number; unidad:string; lotes:number };
type LotRow   = { product_id:string; product_name:string; lote:string|null; vencimiento:string|null; cantidad:number; unidad:string };

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

export default function InventarioPage() {
  const sb = createClient();
  const [grouped, setGrouped] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<(GroupRow|LotRow)[]>([]);

  async function load() {
    setLoading(true);
    try {
      if (grouped) {
        const { data, error } = await sb
          .from('v_inventory_grouped_with_name')
          .select('product_id, product_name, cantidad_total, unidad, lotes')
          .eq('company_id', COMPANY_ID)
          .eq('branch_id', BRANCH_ID)
          .order('product_name', { ascending: true });
        if (error) throw error;
        setRows((data||[]) as GroupRow[]);
      } else {
        const { data, error } = await sb
          .from('v_stock_lots_with_name')
          .select('product_id, product_name, lote, vencimiento, cantidad, unidad')
          .eq('company_id', COMPANY_ID)
          .eq('branch_id', BRANCH_ID)
          .order('vencimiento', { ascending: true, nullsFirst: true })
          .order('product_name', { ascending: true });
        if (error) throw error;
        setRows((data||[]) as LotRow[]);
      }
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, [grouped]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Inventario</h1>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={grouped} onChange={e=>setGrouped(e.target.checked)}/>
          Vista agrupada por producto
        </label>
        <Link href="/compras" className="ml-auto px-3 py-1 rounded-xl border">+ Registrar compra</Link>
      </div>

      {loading ? (
        <div>Cargando…</div>
      ) : grouped ? (
        <div className="rounded-2xl border bg-white p-3 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th>Producto</th><th>Cantidad</th><th>Unidad</th><th>Lotes</th><th></th>
              </tr>
            </thead>
            <tbody>
              {(rows as GroupRow[]).map(r=>(
                <tr key={r.product_id} className="border-b">
                  <td>{r.product_name}</td>
                  <td>{Number(r.cantidad_total).toFixed(2)}</td>
                  <td>{r.unidad}</td>
                  <td>{r.lotes}</td>
                  <td><Link className="underline" href={`/inventario/producto/${r.product_id}`}>Ver historial</Link></td>
                </tr>
              ))}
              {(rows as GroupRow[]).length===0 && (
                <tr><td colSpan={5} className="py-6 text-gray-500 text-center">Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-3 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th>Producto</th><th>Lote</th><th>Vence</th><th>Cantidad</th><th>Unidad</th>
              </tr>
            </thead>
            <tbody>
              {(rows as LotRow[]).map((r,idx)=>(
                <tr key={idx} className="border-b">
                  <td>{r.product_name}</td>
                  <td>{r.lote || '—'}</td>
                  <td>{r.vencimiento || '—'}</td>
                  <td>{Number(r.cantidad).toFixed(2)}</td>
                  <td>{r.unidad}</td>
                </tr>
              ))}
              {(rows as LotRow[]).length===0 && (
                <tr><td colSpan={5} className="py-6 text-gray-500 text-center">Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
