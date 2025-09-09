'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import Link from 'next/link';

type Row = { lote:string|null; vence:string|null; cantidad:number; unidad:string; proveedor?:string; fecha?:string };

export default function ProductoHistPage({ params }: { params: { id:string } }) {
  const sb = createClient();
  const [nombre, setNombre] = useState('');
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(()=>{ (async ()=>{
    const { data: p } = await sb.from('products').select('nombre').eq('id', params.id).single();
    setNombre(p?.nombre || '');
    const { data } = await sb
      .from('stock_moves')
      .select('cantidad, unidad, motivo, referencia, purchase_id, purchases(fecha, suppliers(nombre)), stock_lots(lote, vencimiento)')
      .eq('product_id', params.id)
      .order('created_at', { ascending:false });
    const normalized = (data||[]).map((x:any)=>({
      lote: x.stock_lots?.lote, vence: x.stock_lots?.vencimiento,
      cantidad: x.cantidad, unidad: x.unidad,
      proveedor: x.purchases?.suppliers?.nombre, fecha: x.purchases?.fecha
    }));
    setRows(normalized);
  })(); }, [params.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Historial: {nombre}</h1>
        <Link href="/inventario" className="ml-auto underline">← Volver</Link>
      </div>

      <div className="rounded-2xl border bg-white p-3 overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th>Lote</th><th>Vence</th><th>Cantidad</th><th>Unidad</th><th>Proveedor</th><th>Fecha compra</th></tr></thead>
          <tbody>
            {rows.map((r,idx)=>(
              <tr key={idx} className="border-b">
                <td>{r.lote||'—'}</td><td>{r.vence||'—'}</td><td>{Number(r.cantidad).toFixed(2)}</td><td>{r.unidad}</td><td>{r.proveedor||'—'}</td><td>{r.fecha? new Date(r.fecha).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
