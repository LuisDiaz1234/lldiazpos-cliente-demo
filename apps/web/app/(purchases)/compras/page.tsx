'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type Supplier = { id:string; nombre:string };
type Product  = { id:string; nombre:string; es_insumo:boolean; unidad:string };

type POItem = {
  product_id:string;
  cantidad:number;
  unidad:string;
  costo_unit:number;
  lote?:string;
  vence?:string; // YYYY-MM-DD
};

export default function ComprasPage() {
  const sb = createClient();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products,  setProducts]  = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState<string>('');
  const [items, setItems] = useState<POItem[]>([]);

  useEffect(()=>{ (async()=>{
    const a = await sb.from('suppliers').select('id,nombre');
    setSuppliers(a.data||[]);
    const b = await sb.from('products').select('id,nombre,es_insumo,unidad').eq('es_insumo', true);
    setProducts(b.data||[]);
  })(); }, []);

  function addItem() {
    if (!products.length) return;
    setItems(i=>[...i, { product_id: products[0].id, cantidad:1, unidad:'unidad', costo_unit:0 }]);
  }
  function setItem(i:number, patch: Partial<POItem>) {
    setItems(prev=>{ const a=[...prev]; a[i] = { ...a[i], ...patch }; return a; });
  }
  function removeItem(i:number) { setItems(prev=>prev.filter((_,idx)=>idx!==i)); }

  const total = items.reduce((a,x)=> a + Number(x.cantidad||0)*Number(x.costo_unit||0), 0);

  async function guardar() {
    if (!supplierId) { alert('Selecciona proveedor'); return; }
    if (!items.length) { alert('Agrega items'); return; }

    const payload = {
      supplier_id: supplierId,
      items
    };
    const r = await fetch('/api/compras/crear', { method:'POST', body: JSON.stringify(payload) });
    const t = await r.text(); let j:any={}; try{ j=JSON.parse(t);}catch{}
    if (!r.ok) { alert('Error: '+t); return; }
    setItems([]); alert('Compra guardada. Inventory actualizado. ID: '+j.purchase_id);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Compras (Orden de compra → Inventario)</h1>

      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">Proveedor</label>
          <select value={supplierId} onChange={e=>setSupplierId(e.target.value)} className="border rounded-xl px-3 py-1">
            <option value="">— selecciona —</option>
            {suppliers.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>

          <button onClick={addItem} className="px-3 py-1 rounded-xl border">+ Agregar ítem</button>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th>Insumo</th><th>Cant</th><th>Unidad</th><th>Costo</th><th>Lote</th><th>Vence</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((x,idx)=>(
                <tr key={idx} className="border-b">
                  <td>
                    <select value={x.product_id} onChange={e=>setItem(idx,{product_id:e.target.value})} className="border rounded px-2 py-1">
                      {products.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </td>
                  <td><input type="number" step="0.01" value={x.cantidad} onChange={e=>setItem(idx,{cantidad:Number(e.target.value)})} className="border rounded px-2 py-1 w-24"/></td>
                  <td>
                    <select value={x.unidad} onChange={e=>setItem(idx,{unidad:e.target.value})} className="border rounded px-2 py-1">
                      <option value="unidad">unidad</option>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="l">l</option>
                    </select>
                  </td>
                  <td><input type="number" step="0.01" value={x.costo_unit} onChange={e=>setItem(idx,{costo_unit:Number(e.target.value)})} className="border rounded px-2 py-1 w-28"/></td>
                  <td><input value={x.lote||''} onChange={e=>setItem(idx,{lote:e.target.value})} className="border rounded px-2 py-1 w-28"/></td>
                  <td><input type="date" value={x.vence||''} onChange={e=>setItem(idx,{vence:e.target.value})} className="border rounded px-2 py-1"/></td>
                  <td><button onClick={()=>removeItem(idx)} className="px-2 border rounded">x</button></td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={7} className="py-4 text-gray-500">Sin items</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between font-medium">
          <span>Total compra</span>
          <span>${total.toFixed(2)}</span>
        </div>

        <button onClick={guardar} className="px-4 py-2 rounded-2xl bg-amber-300 hover:bg-amber-200">
          Guardar compra
        </button>
      </div>
    </div>
  );
}
