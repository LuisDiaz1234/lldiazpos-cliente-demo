'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function DashboardPage() {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi]: any = useState(null);
  const [pagos, setPagos]: any = useState([]);

  async function load(d: string) {
    setLoading(true);
    try {
      const r = await fetch(`/api/dashboard?date=${d}`, { cache: 'no-store' });
      const j = await r.json();
      setKpi(j.kpi);
      setPagos(j.pagos?.map((x:any)=>({ name: x.metodo, value: Number(x.total_metodo) })) || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(date); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <input type="date" value={date} onChange={e=>{ setDate(e.target.value); load(e.target.value); }} className="border rounded-xl px-3 py-1"/>
      </div>

      {loading ? <div>Cargando…</div> : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm text-gray-500">Ventas</div>
              <div className="text-2xl font-semibold">{kpi?.ventas_count || 0}</div>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm text-gray-500">Total</div>
              <div className="text-2xl font-semibold">${(Number(kpi?.ventas_total)||0).toFixed(2)}</div>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm text-gray-500">ITBMS</div>
              <div className="text-2xl font-semibold">${(Number(kpi?.itbms_total)||0).toFixed(2)}</div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 font-medium">Pagos por método</div>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie dataKey="value" data={pagos} outerRadius={100} label />
                  <Tooltip />
                  <Legend />
                  {pagos.map((_ :any, i:number)=><Cell key={i} />)}
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
