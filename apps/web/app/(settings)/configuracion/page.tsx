'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';

export default function ConfiguracionPage(){
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const [autoEmit, setAutoEmit] = useState(false);
  const [descJub, setDescJub]   = useState<string>('0');

  async function load(){
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('auto_emit_dgi, descuento_jubilado')
      .eq('id', COMPANY_ID)
      .single();
    if(error){ alert(error.message); setLoading(false); return; }
    setAutoEmit(Boolean(data?.auto_emit_dgi));
    setDescJub(String(data?.descuento_jubilado ?? 0));
    setLoading(false);
  }

  useEffect(()=>{ load(); },[]);

  async function save(){
    setSaving(true);
    const res = await fetch('/api/config/company-update', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        id: COMPANY_ID,
        auto_emit_dgi: autoEmit,
        descuento_jubilado: Number(descJub || 0),
      }),
    });
    setSaving(false);
    if(!res.ok){ alert(await res.text()); return; }
    alert('Configuración guardada');
  }

  if(loading) return <div>Cargando…</div>;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-xl font-semibold">Configuración</h1>

      <div className="rounded-2xl border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Emitir a DGI al cobrar</div>
            <div className="text-sm text-gray-500">Si está activo, al cerrar una venta se intenta emitir la factura (usa MOCK o REAL según tu .env de Vercel).</div>
          </div>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={autoEmit} onChange={e=>setAutoEmit(e.target.checked)} />
            <span className="text-sm">Activar</span>
          </label>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500">Descuento Jubilado (%)</label>
            <input className="border rounded-xl px-3 py-2 w-full" type="number" step="0.01"
              value={descJub} onChange={e=>setDescJub(e.target.value)} />
          </div>
          <button onClick={save} disabled={saving}
            className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-4 py-2">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
