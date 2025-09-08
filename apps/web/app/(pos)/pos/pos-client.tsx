// apps/web/app/(pos)/pos/pos-client.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type Producto = { id: string; nombre: string; precio: number; activo: boolean; es_insumo: boolean };
type ItemCarrito = {
  product_id: string; nombre: string; cantidad: number; precio_unit: number; itbms_rate: number; descuento: number;
};

export default function POSClient(){
  const supabase = createClient();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ (async ()=>{
    const { data, error } = await supabase
      .from('products')
      .select('id,nombre,precio,activo,es_insumo')
      .eq('activo', true)
      .limit(200);
    if (!error) {
      const vendibles = (data||[]).filter((p:any)=> p.es_insumo === false);
      setProductos(vendibles);
    } else {
      console.error(error);
    }
    setLoading(false);
  })(); },[]);

  const add = (p: Producto)=>{
    setItems(prev=>{
      const i = prev.findIndex(x=>x.product_id===p.id);
      if(i>-1){ const cp=[...prev]; cp[i].cantidad += 1; return cp; }
      return [...prev,{ product_id:p.id, nombre:p.nombre, cantidad:1, precio_unit:Number(p.precio), itbms_rate:0.07, descuento:0 }];
    });
  };

  const total = items.reduce((s,it)=> s + (it.cantidad*it.precio_unit - it.descuento)*(1+it.itbms_rate),0);

  async function cobrar(){
    if(items.length===0){ alert('Agrega productos'); return; }
    const payload = {
      p_company: '11111111-1111-1111-1111-111111111111',
      p_branch:  '22222222-2222-2222-2222-222222222222',
      p_customer: null,
      p_items: items,
      p_pagos: [{metodo:'efectivo', monto: total}],
      p_desc_jubilado: 0,
      p_session: null
    };
    const res = await fetch('/api/ventas/procesar', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    if(!res.ok){ const t = await res.text(); alert('Error al procesar: '+t); return; }
    const { sale_id } = await res.json();
    alert('Venta OK: '+sale_id);
    setItems([]);
  }

  if (loading) return <div>Cargando…</div>;

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-8">
        {productos.length===0 && <div className="text-sm text-gray-500">No hay productos vendibles aún.</div>}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {productos.map((p)=> (
            <button key={p.id} onClick={()=>add(p)} className="rounded-2xl border p-3 text-left hover:shadow">
              <div className="aspect-square rounded-xl bg-gray-50 mb-2" />
              <div className="font-medium">{p.nombre}</div>
              <div className="text-sm text-gray-500">$ {Number(p.precio).toFixed(2)}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="col-span-4">
        <div className="rounded-2xl border p-4 sticky top-24">
          <h2 className="font-semibold mb-3">Carrito</h2>
          <div className="space-y-2 max-h-[50vh] overflow-auto">
            {items.map(it=> (
              <div key={it.product_id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <div className="font-medium">{it.nombre}</div>
                  <div className="text-xs text-gray-500">x{it.cantidad}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setItems(prev=>prev.map(p=>p.product_id===it.product_id?{...p,cantidad:Math.max(1,p.cantidad-1)}:p))} className="px-2 py-1 border rounded-xl">-</button>
                  <button onClick={()=>setItems(prev=>prev.map(p=>p.product_id===it.product_id?{...p,cantidad:p.cantidad+1}:p))} className="px-2 py-1 border rounded-xl">+</button>
                  <div className="w-16 text-right">${((it.cantidad*it.precio_unit - it.descuento)*(1+it.itbms_rate)).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between text-lg font-semibold">
            <span>Total</span><span>${total.toFixed(2)}</span>
          </div>
          <button onClick={cobrar} className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2">Cobrar</button>
        </div>
      </div>
    </div>
  );
}
