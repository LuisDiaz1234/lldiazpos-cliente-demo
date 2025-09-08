'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

export default function FacturasPage(){
  const supabase = createClient();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(){
    setLoading(true);
    const { data, error } = await supabase
      .from('v_invoices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if(error){ alert(error.message); setLoading(false); return; }
    setRows(data||[]);
    setLoading(false);
  }

  useEffect(()=>{ load(); },[]);

  async function emitir(sale_id: string){
    const res = await fetch('/api/dgi/emit', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ sale_id })
    });
    const txt = await res.text();
    if(!res.ok){ alert('Error: '+txt); return; }
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Facturas (DGI)</h1>

      <div className="overflow-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Fecha venta</th>
              <th className="p-2 text-left">Venta</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2 text-left">Estado</th>
              <th className="p-2 text-left">Folio</th>
              <th className="p-2 text-left">QR</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r:any)=>(
              <tr key={r.invoice_id} className="border-t">
                <td className="p-2">{new Date(r.fecha).toISOString().slice(0,19).replace('T',' ')}</td>
                <td className="p-2">{r.sale_id}</td>
                <td className="p-2 text-right">${Number(r.total).toFixed(2)}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{r.folio || '-'}</td>
                <td className="p-2">
                  {r.qr_url ? <a href={r.qr_url} target="_blank" className="text-sky-600 underline">Verificar</a> : '-'}
                </td>
                <td className="p-2">
                  <div className="flex gap-2">
                    {r.status!=='emitida' ? (
                      <button onClick={()=>emitir(r.sale_id)} className="px-3 py-1 border rounded-xl">Emitir</button>
                    ) : (
                      <>
                        <a href={`/facturas/${r.invoice_id}`} className="px-3 py-1 border rounded-xl inline-block">Ver/Imprimir</a>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="p-4 text-center text-gray-500">Sin facturas</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
