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
  const [loading, setLoading] = useState(true);

  async function load(){
    setLoading(true);
    const { data } = await supabase
      .from('cash_sessions')
      .select('id,apertura,cierre,estado,saldo_inicial,saldo_final')
      .eq('company_id', COMPANY_ID)
      .eq('branch_id', BRANCH_ID)
      .order('apertura', { ascending: false })
      .limit(1);
    setSession(data?.[0] || null);
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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Caja</h1>

      {!session || session.estado==='cerrada' ? (
        <button onClick={abrir} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-2">
          Abrir caja
        </button>
      ) : (
        <div className="rounded-2xl border p-4">
          <div className="flex justify-between">
            <div>
              <div className="font-medium">Sesión abierta</div>
              <div className="text-sm text-gray-500">Apertura: {session.apertura?.toString()?.slice(0,19)}</div>
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
    </div>
  );
}
