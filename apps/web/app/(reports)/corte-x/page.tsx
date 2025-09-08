'use client';

import { useEffect, useState } from 'react';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

export default function CorteXPage(){
  const [fecha, setFecha] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|undefined>();

  useEffect(()=>{
    const y = new Date().toISOString().slice(0,10);
    setFecha(y);
  },[]);

  async function cargar(){
    if(!fecha) return;
    setLoading(true); setErr(undefined);
    try{
      const res = await fetch('/api/reportes/corte-diario', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ p_company: COMPANY_ID, p_branch: BRANCH_ID, p_date: fecha })
      });
      if(!res.ok){ setErr(await res.text()); setLoading(false); return; }
      setData(await res.json());
    }catch(e:any){ setErr(e?.message || 'Error'); }
    setLoading(false);
  }

  const tot = data?.totales || {};
  const pagos = data?.pagos || [];
  const top = data?.top_items || [];

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500">Fecha</label>
          <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} className="border rounded-xl px-3 py-2"/>
        </div>
        <button onClick={cargar} className="px-4 py-2 border rounded-xl">{loading?'Cargando…':'Cargar'}</button>
        {data && (
          <button onClick={()=>window.print()} className="px-4 py-2 border rounded-xl no-print">Imprimir</button>
        )}
      </div>

      {err && <div className="text-rose-600 text-sm">{err}</div>}

      {data && (
        <div className="bg-white p-6 rounded-2xl border">
          <h1 className="text-xl font-semibold">Corte {`X/Z`} — {data.fecha}</h1>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border p-4">
              <div className="text-sm text-gray-500">Subtotal</div>
              <div className="text-2xl font-semibold">${Number(tot.subtotal||0).toFixed(2)}</div>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="text-sm text-gray-500">Descuentos</div>
              <div className="text-2xl font-semibold">-${Number(tot.descuentos||0).toFixed(2)}</div>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="text-sm text-gray-500">ITBMS</div>
              <div className="text-2xl font-semibold">${Number(tot.itbms||0).toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border p-4">
            <div className="text-sm text-gray-500 mb-2">Pagos por método</div>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Método</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p:any)=>(
                  <tr key={p.metodo} className="border-t">
                    <td className="p-2">{p.metodo}</td>
                    <td className="p-2 text-right">${Number(p.total).toFixed(2)}</td>
                  </tr>
                ))}
                {pagos.length===0 && <tr><td colSpan={2} className="p-2 text-center text-gray-500">Sin pagos</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-2xl border p-4">
            <div className="text-sm text-gray-500 mb-2">Top ítems</div>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Producto</th>
                  <th className="p-2 text-right">Cant.</th>
                  <th className="p-2 text-right">Bruto</th>
                  <th className="p-2 text-right">Desc. línea</th>
                </tr>
              </thead>
              <tbody>
                {top.map((r:any)=>(
                  <tr key={r.product_id} className="border-t">
                    <td className="p-2">{r.nombre || r.product_id}</td>
                    <td className="p-2 text-right">{Number(r.cantidad).toFixed(2)}</td>
                    <td className="p-2 text-right">${Number(r.bruto).toFixed(2)}</td>
                    <td className="p-2 text-right">${Number(r.desc_linea).toFixed(2)}</td>
                  </tr>
                ))}
                {top.length===0 && <tr><td colSpan={4} className="p-2 text-center text-gray-500">Sin ventas</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="text-2xl font-semibold">Total del día: ${Number(tot.total||0).toFixed(2)}</div>
          </div>
        </div>
      )}

      <style>{`@media print {.no-print{display:none} body{background:white}}`}</style>
    </div>
  );
}
