'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type Producto = { id: string; nombre: string; precio: number; activo: boolean; es_insumo: boolean };
type Metodo = 'efectivo' | 'tarjeta' | 'ach' | 'yappy';

type CarritoItem = {
  product_id: string; nombre: string; cantidad: number;
  precio_unit: number; itbms_rate: number; descuento: number;
};
type PagoItem = { metodo: Metodo; monto: number };

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

export default function POSClient() {
  const sb = createClient();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito]   = useState<CarritoItem[]>([]);
  const [pagos, setPagos]       = useState<PagoItem[]>([{ metodo:'efectivo', monto: 0 }]);
  const [recibido, setRecibido] = useState<number>(0); // <- con cuánto paga en efectivo
  const [descJub, setDescJub]   = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(()=>{(async()=>{
    setLoading(true);
    const { data } = await sb.from('products')
      .select('id,nombre,precio,activo,es_insumo')
      .eq('activo', true).eq('es_insumo', false);
    setProductos(data||[]);
    setLoading(false);
  })()}, []);

  function addToCart(p: Producto) {
    setCarrito(prev=>{
      const i = prev.findIndex(x=>x.product_id===p.id);
      if (i>=0) { const a=[...prev]; a[i].cantidad++; return a; }
      return [...prev, { product_id:p.id, nombre:p.nombre, cantidad:1, precio_unit:+p.precio, itbms_rate:0.07, descuento:0 }];
    });
  }

  // Totales
  const subtotal = useMemo(()=> carrito.reduce((a,c)=>a + c.cantidad*c.precio_unit, 0), [carrito]);
  const itbms    = useMemo(()=> carrito.reduce((a,c)=>a + (c.cantidad*c.precio_unit - c.descuento)*c.itbms_rate, 0), [carrito]);
  const totalSin = useMemo(()=> subtotal + itbms, [subtotal, itbms]);
  const total    = useMemo(()=> +(totalSin - (descJub ? subtotal*0.15 : 0)).toFixed(2), [totalSin, descJub, subtotal]);

  const pagado   = useMemo(()=> pagos.reduce((a,p)=>a + Number(p.monto||0), 0), [pagos]);
  const pendiente= useMemo(()=> +(total - pagado).toFixed(2), [total, pagado]);

  // Efectivo y cambio
  const efectivo = useMemo(()=> pagos.filter(p=>p.metodo==='efectivo').reduce((a,p)=>a + Number(p.monto||0), 0), [pagos]);
  const cambio   = useMemo(()=>{
    const otros = pagado - efectivo;
    const aCubrirConEfectivo = Math.max(0, total - otros);
    return Math.max(0, +(efectivo - aCubrirConEfectivo).toFixed(2));
  }, [efectivo, pagado, total]);

  // Al escribir “Recibido”, lo volcamos al pago efectivo principal
  useEffect(()=>{
    setPagos(prev=>{
      let a=[...prev];
      let i=a.findIndex(p=>p.metodo==='efectivo');
      if (i<0) { a=[{metodo:'efectivo', monto:0}, ...a]; i=0; }
      a[i] = { ...a[i], monto: +recibido || 0 };
      return a;
    });
  }, [recibido]);

  function setPago(idx:number, patch: Partial<PagoItem>) {
    setPagos(prev=>{ const a=[...prev]; a[idx]={...a[idx], ...patch}; return a; });
  }
  function addPago(m:Metodo='efectivo'){ setPagos(p=>[...p, {metodo:m, monto:0}]); }
  function rmPago(i:number){ setPagos(p=>p.filter((_,idx)=>idx!==i)); }

  // Atajos
  const billetes = [1,5,10,20,40,50,100];
  function sumarEfectivo(v:number){ setRecibido(r=>+(r+v).toFixed(2)); }
  function setExacto(){ setRecibido(total); }
  function setTodo(){ if (pendiente>0) setRecibido(r=>+(r+pendiente).toFixed(2)); }

  async function cobrar(){
    if (!carrito.length) { alert('Carrito vacío'); return; }
    if (pendiente>0)     { alert('Faltan pagos por $'+pendiente.toFixed(2)); return; }

    const payload = {
      company_id: COMPANY_ID,
      branch_id : BRANCH_ID,
      customer_id: null,
      desc_jubilado: descJub ? 0.15 : 0,
      items: carrito.map(c=>({
        product_id:c.product_id, cantidad:c.cantidad, precio_unit:c.precio_unit,
        itbms_rate:c.itbms_rate, descuento:c.descuento
      })),
      pagos: pagos.map(p=>({ metodo:p.metodo, monto:+p.monto }))
    };

    const r = await fetch('/api/pos/cobrar', {method:'POST', body:JSON.stringify(payload)});
    const t = await r.text(); let j:any={}; try{ j=JSON.parse(t);}catch{}
    if (!r.ok) { alert('Error al cobrar:\n'+t); return; }

    setCarrito([]); setPagos([{metodo:'efectivo', monto:0}]); setRecibido(0);
    alert('Venta OK.' + (j.auto_emit_dgi ? ' DGI emitida.' : '') + (cambio>0?`\nCambio: $${cambio.toFixed(2)}`:''));
  }

  return (
    <div className="grid md:grid-cols-[1fr_360px] gap-6">
      <div>
        <div className="grid sm:grid-cols-3 gap-3">
          {loading? <div>Cargando…</div> :
            productos.map(p=>(
              <button key={p.id} onClick={()=>addToCart(p)} className="rounded-2xl border bg-white p-4 text-left hover:shadow">
                <div className="font-medium">{p.nombre}</div>
                <div className="text-gray-600">${Number(p.precio).toFixed(2)}</div>
              </button>
            ))
          }
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <div className="font-semibold">Carrito</div>
        {!carrito.length && <div className="text-sm text-gray-500">Carrito vacío</div>}

        {carrito.map((c,idx)=>(
          <div key={idx} className="flex items-center justify-between gap-2 text-sm">
            <div className="w-1/2 truncate">{c.nombre}</div>
            <div className="flex items-center gap-2">
              <button onClick={()=>setCarrito(prev=>{const a=[...prev]; a[idx].cantidad=Math.max(1,a[idx].cantidad-1); return a;})} className="px-2 border rounded">-</button>
              <span className="min-w-[2ch] text-center">{c.cantidad}</span>
              <button onClick={()=>setCarrito(prev=>{const a=[...prev]; a[idx].cantidad+=1; return a;})} className="px-2 border rounded">+</button>
            </div>
            <div className="tabular-nums">${(c.cantidad*c.precio_unit).toFixed(2)}</div>
          </div>
        ))}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={descJub} onChange={e=>setDescJub(e.target.checked)}/>
          Aplicar descuento Jubilado (15%)
        </label>

        <div className="border-t pt-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>ITBMS</span><span className="tabular-nums">${itbms.toFixed(2)}</span></div>
          <div className="flex justify-between font-semibold text-lg"><span>Total</span><span className="tabular-nums">${total.toFixed(2)}</span></div>
        </div>

        {/* Pagos */}
        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-medium">Pagos</div>
            <div className="hidden md:flex items-center gap-1">
              <button onClick={setExacto} className="px-2 py-1 text-xs border rounded">Exacto</button>
              <button onClick={setTodo}  className="px-2 py-1 text-xs border rounded">Todo</button>
              {billetes.map(b=>(
                <button key={b} onClick={()=>sumarEfectivo(b)} className="px-2 py-1 text-xs border rounded">${b}</button>
              ))}
            </div>
          </div>

          {/* Recibido rápido */}
          <div className="flex items-center gap-2">
            <label className="text-sm w-28">Recibido $</label>
            <input
              type="number" step="0.01" inputMode="decimal"
              value={recibido} onChange={e=>setRecibido(+e.target.value||0)}
              className="border rounded px-2 py-1 w-32 tabular-nums"
            />
            {cambio>0 && <span className="ml-auto text-sm font-semibold text-green-700">Cambio ${cambio.toFixed(2)}</span>}
          </div>

          {/* Otros pagos */}
          {pagos.map((p,idx)=>(
            <div key={idx} className="flex items-center gap-2">
              <select value={p.metodo} onChange={e=>setPago(idx,{metodo:e.target.value as Metodo})} className="border rounded px-2 py-1">
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="ach">ACH</option>
                <option value="yappy">Yappy</option>
              </select>
              <input type="number" step="0.01" inputMode="decimal"
                value={p.monto} onChange={e=>setPago(idx,{monto:+e.target.value || 0})}
                className="border rounded px-2 py-1 w-28 tabular-nums" />
              {pagos.length>1 && <button onClick={()=>rmPago(idx)} className="px-2 border rounded" title="Quitar">×</button>}
            </div>
          ))}

          <button onClick={()=>addPago('tarjeta')} className="mt-1 text-sm underline">+ Agregar método de pago</button>

          <div className="flex justify-between mt-3 text-sm"><span>Pagado</span><span className="tabular-nums">${pagado.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span>Pendiente</span><span className="tabular-nums">${pendiente.toFixed(2)}</span></div>
        </div>

        <button onClick={cobrar} className="w-full py-3 rounded-2xl bg-amber-300 hover:bg-amber-200 font-medium">
          Cobrar
        </button>
      </div>
    </div>
  );
}
