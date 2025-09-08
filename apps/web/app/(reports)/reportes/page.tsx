'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';

export default function Reportes(){
  const supabase = createClient();
  const [desde, setDesde] = useState<string>('');
  const [hasta, setHasta] = useState<string>('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    const today = new Date();
    const y = today.toISOString().slice(0,10);
    setDesde(y);
    setHasta(y);
  },[]);

  async function cargar(){
    if(!desde || !hasta) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('id, fecha, total')
      .eq('company_id', COMPANY_ID)
      .gte('fecha', desde+' 00:00:00')
      .lte('fecha', hasta+' 23:59:59')
      .order('fecha', { ascending: true });

    if(error){ alert(error.message); setLoading(false); return; }

    const mapped = (data||[]).map((s:any)=>({
      fecha: new Date(s.fecha).toISOString().slice(0,19).replace('T',' '),
      documento: s.id,
      cliente: 'Mostrador',
      total: Number(s.total)
    }));
    setRows(mapped);
    setLoading(false);
  }

  async function exportar(){
    const res = await fetch('/api/reportes/ventas-excel', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ rows })
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`ventas_${desde}_a_${hasta}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reportes</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500">Desde</label>
          <input type="date" value={desde} onChange={e=>setDesde(e.target.value)} className="border rounded-xl px-3 py-2"/>
        </div>
        <div>
          <label className="block text-xs text-gray-500">Hasta</label>
          <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)} className="border rounded-xl px-3 py-2"/>
        </div>
        <button onClick={cargar} className="bg-gray-800 text-white rounded-xl px-4 py-2">{loading?'Cargando…':'Cargar'}</button>
        <button onClick={exportar} disabled={!rows.length} className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl px-4 py-2">
          Exportar Excel
        </button>
      </div>

      <div className="overflow-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Fecha</th>
              <th className="text-left p-2">Documento</th>
              <th className="text-left p-2">Cliente</th>
              <th className="text-right p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} className="border-t">
                <td className="p-2">{r.fecha}</td>
                <td className="p-2">{r.documento}</td>
                <td className="p-2">{r.cliente}</td>
                <td className="p-2 text-right">${r.total.toFixed(2)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="p-4 text-center text-gray-500">Sin datos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
