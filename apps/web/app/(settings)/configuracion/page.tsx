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

  const [nombre, setNombre]       = useState('');
  const [logoUrl, setLogoUrl]     = useState('');
  const [ruc, setRuc]             = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono]   = useState('');
  const [email, setEmail]         = useState('');

  async function load(){
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('nombre, auto_emit_dgi, descuento_jubilado, logo_url, ruc, direccion, telefono, email')
      .eq('id', COMPANY_ID)
      .single();
    if(error){ alert(error.message); setLoading(false); return; }
    setNombre(data?.nombre || '');
    setAutoEmit(Boolean(data?.auto_emit_dgi));
    setDescJub(String(data?.descuento_jubilado ?? 0));
    setLogoUrl(data?.logo_url || '');
    setRuc(data?.ruc || '');
    setDireccion(data?.direccion || '');
    setTelefono(data?.telefono || '');
    setEmail(data?.email || '');
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
        nombre,
        auto_emit_dgi: autoEmit,
        descuento_jubilado: Number(descJub || 0),
        logo_url: logoUrl || null,
        ruc: ruc || null,
        direccion: direccion || null,
        telefono: telefono || null,
        email: email || null,
      }),
    });
    setSaving(false);
    if(!res.ok){ alert(await res.text()); return; }
    alert('Configuración guardada');
  }

  if(loading) return <div>Cargando…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold">Configuración</h1>

      <div className="rounded-2xl border p-4 space-y-4">
        {/* Nombre y logo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500">Nombre de la empresa</label>
            <input className="border rounded-xl px-3 py-2 w-full" value={nombre} onChange={e=>setNombre(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Logo URL</label>
            <input className="border rounded-xl px-3 py-2 w-full" value={logoUrl} onChange={e=>setLogoUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        {/* Datos fiscales y contacto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500">RUC</label>
            <input className="border rounded-xl px-3 py-2 w-full" value={ruc} onChange={e=>setRuc(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Dirección</label>
            <input className="border rounded-xl px-3 py-2 w-full" value={direccion} onChange={e=>setDireccion(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Teléfono</label>
            <input className="border rounded-xl px-3 py-2 w-full" value={telefono} onChange={e=>setTelefono(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Email</label>
            <input className="border rounded-xl px-3 py-2 w-full" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
        </div>

        {/* DGI y Jubilado */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Emitir a DGI al cobrar</div>
            <div className="text-sm text-gray-500">Si está activo, al cerrar una venta se intenta emitir la factura (MOCK/REAL según .env).</div>
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
