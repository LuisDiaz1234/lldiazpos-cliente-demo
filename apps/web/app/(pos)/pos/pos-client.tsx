'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import AddProductButton from '@/components/AddProductButton';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';

type Producto = { id:string; nombre:string; precio:number; activo:boolean; es_insumo:boolean; itbms_rate?:number|null; };
type CartItem = { product_id:string; nombre:string; precio_unit:number; itbms_rate:number; cantidad:number; descuento:number; };

function POSClient() {
  const supabase = createClient();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  async function cargarProductos() {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('id,nombre,precio,activo,es_insumo,itbms_rate')
      .eq('company_id', COMPANY_ID).eq('activo', true).eq('es_insumo', false)
      .order('nombre');
    setProductos(data || []);
    setLoading(false);
  }
  useEffect(()=>{ cargarProductos(); }, [tick]);
  const reload = ()=> setTick(x=>x+1);

  // carrito
  const [items, setItems] = useState<CartItem[]>([]);
  const [descJub, setDescJub] = useState(false);
  function add(p:Producto){
    setItems(arr=>{
      const i = arr.findIndex(x=>x.product_id===p.id);
      if (i>=0){ const c=[...arr]; c[i]={...c[i], cantidad:c[i].cantidad+1}; return c; }
      return [...arr, { product_id:p.id, nombre:p.nombre, precio_unit:Number(p.precio||0), itbms_rate:Number(p.itbms_rate||0), cantidad:1, descuento:0 }];
    });
  }
  function setQty(id:string,q:number){ setItems(arr=>arr.map(x=>x.product_id===id?{...x,cantidad:q}:x).filter(x=>x.cantidad>0)); }
  function clear(){ setItems([]); }
  const tot = useMemo(()=>{
    const sub = items.reduce((a,b)=>a+b.cantidad*b.precio_unit,0);
    const itb = items.reduce((a,b)=>a+Math.round((b.cantidad*b.precio_unit-(b.descuento||0))*(b.itbms_rate||0)*100)/100,0);
    let desc = items.reduce((a,b)=>a+(b.descuento||0),0);
    if (descJub) desc += Math.round(sub*0.15*100)/100;
    const total = Math.max(0, sub+itb-desc);
    return { sub, itb, desc, total };
  },[items,descJub]);

  async function cobrar(){
    if(items.length===0) return;

    const payload = {
      branch_id:'22222222-2222-2222-2222-222222222222',
      company_id: COMPANY_ID,
      customer_id: null,
      desc_jubilado: descJub ? 0.15 : 0,
      items: items.map(x=>({
        product_id:x.product_id, cantidad:x.cantidad, precio_unit:x.precio_unit,
        itbms_rate:x.itbms_rate||0, descuento:x.descuento||0
      })),
      pagos: [{ metodo:'efectivo', monto: tot.total }]
    };

    try {
      const r = await fetch('/api/pos/cobrar', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const txt = await r.text();
      if(!r.ok){
        alert('Error al cobrar:\n' + (txt || '(sin detalle)'));
        return;
      }
      let data:any = {};
      try { data = JSON.parse(txt); } catch {}
      clear();
      if (data?.auto_emit_dgi) {
        if (data?.invoice?.ok) {
          alert('Venta OK y DGI emitida.');
        } else {
          alert('Venta OK. (Aviso) No se pudo emitir DGI automáticamente.\n' + (data?.invoice?.error || ''));
        }
      } else {
        alert('Venta OK.');
      }
    } catch (e:any) {
      alert('Error al cobrar: ' + (e?.message || String(e)));
    }
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">POS</h1>
          <AddProductButton esInsumo={false} onCreated={reload} />
        </div>

        {loading && <div className="text-gray-500">Cargando…</div>}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {productos.map(p=>(
            <button key={p.id} className="rounded-2xl border bg-white p-3 text-left hover:shadow" onClick={()=>add(p)}>
              <div className="h-20 rounded-xl bg-gray-100 mb-2" />
              <div className="font-medium truncate">{p.nombre}</div>
              <div className="text-xs text-gray-500">${Number(p.precio||0).toFixed(2)}</div>
            </button>
          ))}
        </div>
        {!loading && productos.length===0 && <div className="text-gray-500 mt-6">No hay productos vendibles aún.</div>}
      </div>

      <div className="w-full sm:w-96">
        <div className="rounded-2xl border bg-white p-4 space-y-3">
          <div className="font-semibold">Carrito</div>
          {items.length===0 ? <div className="text-sm text-gray-500">Carrito vacío</div> : (
            <div className="space-y-2">
              {items.map(it=>(
                <div key={it.product_id} className="flex items-center justify-between gap-2">
                  <div className="truncate">{it.nombre}</div>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} className="border rounded-xl px-2 py-1 w-20 text-right"
                      value={it.cantidad} onChange={e=>setQty(it.product_id, Number(e.target.value||0))}/>
                    <div className="w-16 text-right text-sm">${(it.cantidad*it.precio_unit).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={descJub} onChange={e=>setDescJub(e.target.checked)} />
            Aplicar descuento Jubilado (15%)
          </label>
          <div className="text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>${tot.sub.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>ITBMS</span><span>${tot.itb.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Descuento</span><span>${tot.desc.toFixed(2)}</span></div>
            <hr className="my-2"/><div className="flex justify-between font-semibold"><span>Total</span><span>${tot.total.toFixed(2)}</span></div>
          </div>
          <button onClick={cobrar} disabled={items.length===0} className="w-full px-4 py-2 rounded-xl bg-amber-300 hover:bg-amber-200 border">Cobrar</button>
        </div>
      </div>
    </div>
  );
}

export default POSClient;
