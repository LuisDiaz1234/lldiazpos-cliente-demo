'use client';

import { useEffect, useState } from 'react';

export default function ArqueoPage({ params }: { params: { id: string } }){
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|undefined>();
  const [tick, setTick] = useState(0);

  async function load(){
    setLoading(true);
    try{
      const res = await fetch(`/api/caja/arqueo/${params.id}?t=${Date.now()}`, { cache: 'no-store' });
      if(!res.ok){ setErr(await res.text()); setLoading(false); return; }
      setData(await res.json());
      setErr(undefined);
    }catch(e:any){ setErr(e?.message || 'Error'); }
    setLoading(false);
  }

  useEffect(()=>{ load(); }, [params.id, tick]);

  // auto-refresh cada 7s mientras la sesión esté abierta
  useEffect(()=>{
    const opened = data?.session?.estado === 'abierta';
    if(!opened) return;
    const i = setInterval(()=> setTick(v=>v+1), 7000);
    return ()=> clearInterval(i);
  }, [data?.session?.estado]);

  if(loading) return <div className="p-6">Cargando…</div>;
  if(err) return <div className="p-6 text-rose-600">{err}</div>;
  if(!data) return <div className="p-6">Sin datos</div>;

  const s = data.session || {};
  const met = data.metodos || [];
  const t = data.totales || {};

  return (
    <div className="max-w-3xl mx-auto bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Arqueo de caja</h1>
          <div className="text-sm text-gray-500">Sesión: {s.id}</div>
          <div className="text-sm text-gray-500">Apertura: {s.apertura?.slice(0,19).replace('T',' ')}</div>
          {s.cierre && <div className="text-sm text-gray-500">Cierre: {s.cierre.slice(0,19).replace('T',' ')}</div>}
          <div className="text-xs mt-1">Estado: <b>{s.estado}</b></div>
        </div>
        <div className="no-print flex gap-2">
          <button onClick={load} className="px-3 py-2 border rounded-xl">Actualizar</button>
          <a href="/reportes/corte-x" className="px-3 py-2 border rounded-xl">Ir a Corte X</a>
          <button onClick={()=>window.print()} className="px-3 py-2 border rounded-xl">Imprimir</button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Método</th>
              <th className="p-2 text-right">Ingresos</th>
              <th className="p-2 text-right">Egresos</th>
              <th className="p-2 text-right">Neto</th>
            </tr>
          </thead>
          <tbody>
            {met.map((m:any)=>(
              <tr key={m.metodo} className="border-t">
                <td className="p-2">{m.metodo}</td>
                <td className="p-2 text-right">${Number(m.ingresos).toFixed(2)}</td>
                <td className="p-2 text-right">${Number(m.egresos).toFixed(2)}</td>
                <td className="p-2 text-right">${Number(m.neto).toFixed(2)}</td>
              </tr>
            ))}
            {met.length===0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">Sin movimientos</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Saldo inicial</div>
          <div className="text-2xl font-semibold">${Number(s.saldo_inicial||0).toFixed(2)}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Esperado en caja</div>
          <div className="text-2xl font-semibold">${Number(t.esperado_en_caja||0).toFixed(2)}</div>
        </div>
      </div>

      <style>{`@media print {.no-print{display:none} body{background:white}}`}</style>
    </div>
  );
}
