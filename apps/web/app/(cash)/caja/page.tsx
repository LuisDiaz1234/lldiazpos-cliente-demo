'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

type Session = {
  id: string; apertura: string | null; cierre: string | null; estado: string;
  saldo_inicial: number | null; saldo_final: number | null;
};

export default function CajaPage(){
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [recent, setRecent] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(){
    setLoading(true);
    const [{ data: cur }, { data: rec }] = await Promise.all([
      supabase
        .from('cash_sessions')
        .select('id,apertura,cierre,estado,saldo_inicial,saldo_final')
        .eq('company_id', COMPANY_ID)
        .eq('branch_id', BRANCH_ID)
        .order('apertura', { ascending: false })
        .limit(1),
      supabase
        .from('cash_sessions')
        .select('id,apertura,cierre,estado,saldo_inicial,saldo_final')
        .eq('company_id', COMPANY_ID)
        .eq('branch_id', BRANCH_ID)
        .order('apertura', { ascending: false })
        .limit(5),
    ]);
    setSession(cur?.[0] || null);
    setRecent(rec || []);
    setLoading(false);
  }

  useEffect(()=>{ load(); },[]);

  async function abrir(){
    const res = await fetch('/api/caja/abrir', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ p_company: COMPANY_ID, p_branch: BRANCH_ID })
    });
    if(!res.ok){ alert(await res.text()); return; }
    await load();
  }

  async function cerrar(){
    if(!session?.id) return;
    const res = await fetch('/api/caja/cerrar', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ p_session: session.id })
    });
    if(!res.ok){ alert(await res.text()); return; }
    await load();
  }

  if(loading) return <div>Cargando…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Caja</h1>
        <div className="flex gap-2">
          <a href="/reportes/corte-x" className="px-3 py-2 border rounded-xl">Ir a Corte X</a>
          <button onClick={load} className="px-3 py-2 border rounded-xl">Refrescar</button>
        </div>
      </div>

      {!session || session.estado==='cerrada' ? (
        <button onClick={abrir} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-2">
          Abrir caja
        </button>
      ) : (
        <div className="rounded-2xl border p-4">
          <div className="flex justify-between">
            <div>
              <div className="font-medium">Sesión abierta</div>
              <div className="text-sm text-gray-500">Apertura: {session.apertura?.toString()?.slice(0,19).replace('T',' ')}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Saldo inicial</div>
              <div className="font-semibold">${Number(session.saldo_inicial ?? 0).toFixed(2)}</div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <a href={`/caja/arqueo/${session.id}`} className="border rounded-xl px-4 py-2 inline-block">Ver arqueo</a>
            <button onClick={cerrar} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl px-4 py-2">
              Cerrar caja
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="text-sm font-medium mb-2">Últimas sesiones</div>
        <div className="rounded-2xl border overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Apertura</th>
                <th className="p-2 text-left">Cierre</th>
                <th className="p-2 text-left">Estado</th>
                <th className="p-2">Arqueo</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(r=>(
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.id}</td>
                  <td className="p-2">{r.apertura?.toString()?.slice(0,19).replace('T',' ')}</td>
                  <td className="p-2">{r.cierre ? r.cierre.toString()?.slice(0,19).replace('T',' ') : '-'}</td>
                  <td className="p-2">{r.estado}</td>
                  <td className="p-2 text-center">
                    <a className="px-3 py-1 border rounded-xl inline-block" href={`/caja/arqueo/${r.id}`}>Ver</a>
                  </td>
                </tr>
              ))}
              {!recent.length && <tr><td colSpan={5} className="p-2 text-center text-gray-500">Sin sesiones</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
