'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

type PayAgg = { metodo:string; monto:number };

export default function DashboardPage() {
  const sb = createClient();
  const [day, setDay] = useState<string>(new Date().toISOString().slice(0,10));
  const [ventas, setVentas] = useState<{count:number; total:number; itbms:number}>({count:0,total:0,itbms:0});
  const [pagos, setPagos] = useState<PayAgg[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      // ventas del día
      const { data: v } = await sb
        .from('sales')
        .select('id,total,itbms_total,fecha')
        .eq('company_id', COMPANY_ID).eq('branch_id', BRANCH_ID)
        .gte('fecha', `${day} 00:00:00`).lte('fecha', `${day} 23:59:59`);
      const count = v?.length || 0;
      const total = v?.reduce((a,x)=>a+Number(x.total||0),0) || 0;
      const itbms = v?.reduce((a,x)=>a+Number(x.itbms_total||0),0) || 0;
      setVentas({count,total,itbms});

      // pagos por método (join implícito: payments + sales.fecha del día)
      const { data: p } = await sb
        .from('payments')
        .select('metodo,monto, sale_id, sales!inner(id,fecha)')
        .eq('company_id', COMPANY_ID).eq('branch_id', BRANCH_ID)
        .gte('sales.fecha', `${day} 00:00:00`).lte('sales.fecha', `${day} 23:59:59`);
      const group: Record<string, number> = {};
      (p||[]).forEach(x=>{
        const k = (x.metodo||'otros') as string;
        group[k] = (group[k]||0) + Number(x.monto||0);
      });
      setPagos(Object.entries(group).map(([metodo,monto])=>({metodo, monto:+monto.toFixed(2)})));
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, [day]);

  const chartData = useMemo(()=> pagos.map(p=>({ name: p.metodo.toUpperCase(), Monto: p.monto })), [pagos]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <input type="date" value={day} onChange={e=>setDay(e.target.value)} className="border rounded px-2 py-1"/>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Ventas</div>
          <div className="text-2xl font-semibold">{ventas.count}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-semibold">${ventas.total.toFixed(2)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">ITBMS</div>
          <div className="text-2xl font-semibold">${ventas.itbms.toFixed(2)}</div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 h-[360px]">
        <div className="text-sm text-gray-500 mb-2">Pagos por método</div>
        {loading ? <div>Cargando…</div> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="Monto" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
