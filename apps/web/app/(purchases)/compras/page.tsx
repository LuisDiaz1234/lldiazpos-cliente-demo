'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

type Producto = { id: string; nombre: string; unit: string | null; es_insumo: boolean };

type Item = {
  product_id: string;
  cantidad: number;
  unit: string;
  costo: number;
  lote: string;
  vencimiento: string; // yyyy-mm-dd
  nombre?: string; // UI
};

export default function ComprasPage(){
  const supabase = createClient();
  const [insumos, setInsumos] = useState<Producto[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(()=>{ (async ()=>{
    const { data } = await supabase
      .from('products')
      .select('id,nombre,unit,es_insumo')
      .eq('es_insumo', true)
      .eq('activo', true)
      .order('nombre');
    setInsumos(data || []);
  })(); },[]);

  function addItem(){
    if(!insumos[0]) return;
    setItems(prev=>[
      ...prev,
      {
        product_id: insumos[0].id,
        cantidad: 1,
        unit: insumos[0].unit || 'unidad',
        costo: 1,
        lote: '',
        vencimiento: ''
      }
    ]);
  }

  function update(i:number, patch: Partial<Item>){
    setItems(prev=>{
      const cp=[...prev]; cp[i] = {...cp[i], ...patch}; return cp;
    });
  }

  async function guardar(){
    if(items.length===0){ alert('Agrega al menos un ítem'); return; }
    const payload = {
      p_company: COMPANY_ID,
      p_branch: BRANCH_ID,
      p_supplier: 'Proveedor Demo',
      p_items: items
    };
    const res = await fetch('/api/compras/crear', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if(!res.ok){ alert(await res.text()); return; }
    const { purchase_id } = await res.json();
    alert('Compra creada: '+purchase_id);
    setItems([]);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Compras (ingreso por lotes)</h1>

      <button onClick={addItem} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-2">
        + Agregar ítem
      </button>

      <div className="overflow-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Insumo</th>
              <th className="p-2 text-right">Cantidad</th>
              <th className="p-2">Unidad</th>
              <th className="p-2 text-right">Costo</th>
              <th className="p-2">Lote</th>
              <th className="p-2">Vence</th>
              <th className="p-2">Quitar</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i)=>(
              <tr key={i} className="border-t">
                <td className="p-2">
                  <select className="border rounded-xl px-2 py-1"
                    value={it.product_id}
                    onChange={e=>{
                      const p = insumos.find(x=>x.id===e.target.value)!;
                      update(i, { product_id: p.id, unit: p.unit || 'unidad' });
                    }}>
                    {insumos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </td>
                <td className="p-2 text-right">
                  <input className="border rounded-xl px-2 py-1 w-24 text-right" type="number" step="0.01"
                    value={it.cantidad} onChange={e=>update(i,{cantidad:Number(e.target.value)})}/>
                </td>
                <td className="p-2">
                  <input className="border rounded-xl px-2 py-1 w-28"
                    value={it.unit} onChange={e=>update(i,{unit:e.target.value})}/>
                </td>
                <td className="p-2 text-right">
                  <input className="border rounded-xl px-2 py-1 w-28 text-right" type="number" step="0.01"
                    value={it.costo} onChange={e=>update(i,{costo:Number(e.target.value)})}/>
                </td>
                <td className="p-2">
                  <input className="border rounded-xl px-2 py-1 w-32"
                    value={it.lote} onChange={e=>update(i,{lote:e.target.value})}/>
                </td>
                <td className="p-2">
                  <input className="border rounded-xl px-2 py-1" type="date"
                    value={it.vencimiento} onChange={e=>update(i,{vencimiento:e.target.value})}/>
                </td>
                <td className="p-2">
                  <button onClick={()=>setItems(prev=>prev.filter((_,j)=>j!==i))}
                    className="px-3 py-1 border rounded-xl">×</button>
                </td>
              </tr>
            ))}
            {items.length===0 && <tr><td colSpan={7} className="p-4 text-center text-gray-500">Sin ítems</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button onClick={guardar} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-4 py-2">
          Guardar compra
        </button>
      </div>
    </div>
  );
}
