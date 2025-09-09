'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

type Sale = { id: string; fecha: string; total: number; itbms_total: number };

export default function DashboardPage(){
  const supabase = createClient();
  const [hoyTotal, setHoyTotal] = useState(0);
  const [hoyVentas, setHoyVentas] = useState(0);
  const [hoyITBMS, setHoyITBMS] = useState(0);
  const [serie7, setSerie7]     = useState<{fecha:string,total:number}[]>([]);
  const [top5, setTop5]         = useState<{nombre:string, cantidad:number}[]>([]);

  useEffect(()=>{ (async()=>{
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // ventas de hoy
    const { data: sHoy } = await supabase
      .from('sales').select('id,fecha,total,itbms_total')
      .eq('company_id', COMPANY_ID).eq('branch_id', BRANCH_ID)
      .gte('fecha', start);
    const hoy = (sHoy||[]) as Sale[];
    setHoyVentas(hoy.length);
    setHoyTotal(hoy.reduce((a,b)=>a+Number(b.total||0),0));
    setHoyITBMS(hoy.reduce((a,b)=>a+Number(b.itbms_total||0),0));

    // últimos 7 días
    const start7 = new Date(now.getTime() - 6*24*3600*1000); start7.setHours(0,0,0,0);
    const { data: s7 } = await supabase
      .from('sales').select('id,fecha,total')
      .eq('company_id', COMPANY_ID).eq('branch_id', BRANCH_ID)
      .gte('fecha', start7.toISOString());
    const byDay: Record<string, number> = {};
    (s7||[] as Sale[]).forEach(s=>{
      const d = new Date(s.fecha); d.setHours(0,0,0,0);
      const key = d.toISOString().slice(0,10);
      byDay[key] = (byDay[key]||0)+Number(s.total||0);
    });
    const seq = Array.from({length:7}).map((_,i)=>{
      const d = new Date(start7.getTime()+i*24*3600*1000);
      const key = d.toISOString().slice(0,10);
      return { fecha: key.slice(5), total: byDay[key]||0 };
    });
    setSerie7(seq);

    // Top 5 productos (por cantidad) últimos 7 días
    const { data: items } = await supabase
      .from('sale_items')
      .select('cantidad, sale_id, products(nombre)')
      .gte('created_at', start7.toISOString()); // si no existe created_at, puedes join a sales.fecha con RPC; para demo vale
    const agg: Record<string, number> = {};
    (items||[]).forEach((it:any)=>{
      const n = it.products?.nombre || 'Producto';
      agg[n] = (agg[n]||0) + Number(it.cantidad||0);
    });
    const top = Object.entries(agg).map(([nombre,cantidad])=>({nombre, cantidad})).sort((a,b)=>b.cantidad-a.cantidad).slice(0,5);
    setTop5(top);
  })(); },[]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Ventas hoy</div>
          <div className="text-2xl font-semibold">${hoyTotal.toFixed(2)}</div>
          <div className="text-xs text-gray-500">{hoyVentas} transacciones</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">ITBMS hoy</div>
          <div className="text-2xl font-semibold">${hoyITBMS.toFixed(2)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm text-gray-500">Ticket promedio</div>
          <div className="text-2xl font-semibold">${(hoyVentas? hoyTotal/hoyVentas:0).toFixed(2)}</div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-2 font-medium">Ventas últimos 7 días</div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={serie7}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-2 font-medium">Top 5 productos (cant.)</div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={top5}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cantidad" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
