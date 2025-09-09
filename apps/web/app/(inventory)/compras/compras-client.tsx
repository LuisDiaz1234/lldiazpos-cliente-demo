'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type Proveedor = { id: string; nombre: string };
type Insumo = { id: string; nombre: string; unit: string };
type Item = {
  insumo_id: string;
  cantidad: number;
  unidad: string;
  costo?: number;
  lote?: string;
  vence?: string; // ISO yyyy-mm-dd
};

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

export default function ComprasClient() {
  const supabase = createClient();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [proveedorId, setProveedorId] = useState<string>('');
  const [nuevoProv, setNuevoProv] = useState<string>('');
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ (async ()=>{
    const prov = await supabase
      .from('suppliers')
      .select('id,nombre')
      .eq('company_id', COMPANY_ID)
      .order('nombre', { ascending: true });
    setProveedores(prov.data || []);

    const ins = await supabase
      .from('products')
      .select('id,nombre,unit,es_insumo,activo')
      .eq('es_insumo', true)
      .eq('activo', true)
      .order('nombre', { ascending: true });
    setInsumos((ins.data || []).map(r=>({ id:r.id, nombre:r.nombre, unit: r.unit || 'unidad' })));
  })(); }, []);

  const totalCompra = useMemo(()=> items.reduce((a,i)=> a + Number(i.costo || 0)*Number(i.cantidad||0), 0), [items]);

  function addItem() {
    setItems(prev=>[...prev, { insumo_id:'', cantidad:1, unidad:'unidad', costo:0, lote:'', vence:'' }]);
  }
  function setItem(idx:number, patch: Partial<Item>) {
    setItems(prev=>{ const a=[...prev]; a[idx]={...a[idx], ...patch}; return a; });
  }
  function removeItem(idx:number) {
    setItems(prev=> prev.filter((_,i)=> i!==idx));
  }

  async function ensureProveedor(): Promise<string|null> {
    if (proveedorId && proveedorId !== '__nuevo__') return proveedorId;
    if (proveedorId==='__nuevo__') {
      const nombre = (nuevoProv||'').trim();
      if (!nombre) { alert('Escribe el nombre del proveedor'); return null; }
      const ins = await supabase.from('suppliers').insert({
        company_id: COMPANY_ID,
        nombre
      }).select('id').single();
      if (ins.error) { alert('Error creando proveedor: '+ins.error.message); return null; }
      setProveedores(p=>[...p, { id: ins.data!.id, nombre }]);
      setProveedorId(ins.data!.id);
      return ins.data!.id;
    }
    alert('Selecciona un proveedor');
    return null;
  }

  async function guardarCompra() {
    if (!items.length) { alert('Agrega ítems'); return; }
    const prov = await ensureProveedor();
    if (!prov) return;

    for (const it of items) {
      if (!it.insumo_id) { alert('Falta seleccionar insumo'); return; }
      if (!it.cantidad || it.cantidad<=0) { alert('Cantidad inválida'); return; }
      if (!it.unidad) { alert('Unidad requerida'); return; }
    }

    setSaving(true);

    for (const it of items) {
      const loteInsert = await supabase
        .from('stock_lots')
        .insert({
          id: crypto.randomUUID(),
          company_id: COMPANY_ID,
          branch_id: BRANCH_ID,
          product_id: it.insumo_id,
          lote: it.lote || null,
          vencimiento: it.vence || null,
          cantidad: it.cantidad,
          unit: it.unidad
        })
        .select('id')
        .single();

      if (loteInsert.error) {
        setSaving(false);
        alert('Error creando lote: ' + loteInsert.error.message);
        return;
      }

      const mov = await supabase
        .from('stock_moves')
        .insert({
          company_id: COMPANY_ID,
          branch_id: BRANCH_ID,
          product_id: it.insumo_id,
          lot_id: loteInsert.data!.id,
          cantidad: it.cantidad,
          unit: it.unidad,
          motivo: 'compra'
        });

      if (mov.error) {
        setSaving(false);
        alert('Error registrando movimiento: ' + mov.error.message);
        return;
      }
    }

    setSaving(false);
    setItems([]);
    alert('Compra registrada');
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Compras (Orden de compra → Inventario)</h1>

      <div className="flex items-center gap-3">
        <label className="text-sm w-28">Proveedor</label>
        <select
          value={proveedorId}
          onChange={e=>setProveedorId(e.target.value)}
          className="border rounded px-2 py-1 w-64"
        >
          <option value="">{'— selecciona —'}</option>
          {proveedores.map(p=>(
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
          <option value="__nuevo__">+ Nuevo proveedor…</option>
        </select>

        {proveedorId==='__nuevo__' && (
          <input
            value={nuevoProv}
            onChange={e=>setNuevoProv(e.target.value)}
            placeholder="Nombre del nuevo proveedor"
            className="border rounded px-2 py-1 w-64"
          />
        )}

        <button onClick={addItem} className="ml-auto rounded-lg bg-amber-300 hover:bg-amber-200 px-3 py-1">
          + Agregar ítem
        </button>
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Insumo</th>
              <th className="text-left p-2">Cant</th>
              <th className="text-left p-2">Unidad</th>
              <th className="text-left p-2">Costo (opcional)</th>
              <th className="text-left p-2">Lote</th>
              <th className="text-left p-2">Vence</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.length===0 && (
              <tr><td colSpan={7} className="p-4 text-gray-500">Sin ítems</td></tr>
            )}
            {items.map((it,idx)=>(
              <tr key={idx} className="border-t">
                <td className="p-2">
                  <select
                    value={it.insumo_id}
                    onChange={e=>{
                      const val = e.target.value;
                      const defUnit = insumos.find(x=>x.id===val)?.unit || 'unidad';
                      setItem(idx, { insumo_id: val, unidad: defUnit });
                    }}
                    className="border rounded px-2 py-1 w-56"
                  >
                    <option value="">{'— insumo —'}</option>
                    {insumos.map(i=>(
                      <option key={i.id} value={i.id}>{i.nombre}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    type="number" step="0.01" inputMode="decimal"
                    value={it.cantidad}
                    onChange={e=>setItem(idx, { cantidad: Number(e.target.value) })}
                    className="border rounded px-2 py-1 w-24 tabular-nums"
                  />
                </td>
                <td className="p-2">
                  <select
                    value={it.unidad}
                    onChange={e=>setItem(idx, { unidad: e.target.value })}
                    className="border rounded px-2 py-1 w-28"
                  >
                    <option value="unidad">unidad</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                  </select>
                </td>
                <td className="p-2">
                  <input
                    type="number" step="0.01" inputMode="decimal"
                    value={it.costo ?? 0}
                    onChange={e=>setItem(idx, { costo: Number(e.target.value) })}
                    className="border rounded px-2 py-1 w-28 tabular-nums"
                    placeholder="0.00"
                  />
                </td>
                <td className="p-2">
                  <input
                    value={it.lote || ''}
                    onChange={e=>setItem(idx, { lote: e.target.value })}
                    className="border rounded px-2 py-1 w-28"
                    placeholder="LOTE-001"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="date"
                    value={it.vence || ''}
                    onChange={e=>setItem(idx, { vence: e.target.value })}
                    className="border rounded px-2 py-1"
                  />
                </td>
                <td className="p-2 text-right">
                  <button onClick={()=>removeItem(idx)} className="px-2 py-1 border rounded">Quitar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600">Total compra</div>
        <div className="text-lg font-semibold tabular-nums">${totalCompra.toFixed(2)}</div>
        <button
          onClick={guardarCompra}
          disabled={saving || items.length===0}
          className="ml-auto rounded-xl bg-amber-300 hover:bg-amber-200 px-4 py-2 disabled:opacity-50"
        >
          {saving? 'Guardando…' : 'Guardar compra'}
        </button>
      </div>
    </div>
  );
}
