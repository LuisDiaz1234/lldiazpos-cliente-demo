'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type Producto = { id: string; nombre: string; precio: number; activo: boolean; es_insumo: boolean };

type CarritoItem = {
  product_id: string;
  nombre: string;
  cantidad: number;
  precio_unit: number;
  itbms_rate: number;
  descuento: number;
};

type PagoItem = {
  metodo: 'efectivo' | 'tarjeta' | 'ach';
  monto: number;
  recibido_en?: string; // ISO
};

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

export default function POSClient() {
  const supabase = createClient();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [pagos, setPagos] = useState<PagoItem[]>([{ metodo:'efectivo', monto:0 }]);
  const [descJubilado, setDescJubilado] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ (async ()=>{
    setLoading(true);
    const { data } = await supabase.from('products').select('id,nombre,precio,activo,es_insumo').eq('activo', true).eq('es_insumo', false);
    setProductos(data || []);
    setLoading(false);
  })(); }, []);

  function addToCart(p: Producto) {
    setCarrito(prev=>{
      const i = prev.findIndex(x=>x.product_id===p.id);
      if (i>=0) {
        const c=[...prev]; c[i].cantidad += 1; return c;
      }
      return [...prev, { product_id:p.id, nombre:p.nombre, cantidad:1, precio_unit:Number(p.precio), itbms_rate:0.07, descuento:0 }];
    });
  }

  const subtotal = carrito.reduce((a,c)=>a + c.cantidad * c.precio_unit, 0);
  const itbms    = carrito.reduce((a,c)=>a + (c.cantidad*c.precio_unit - c.descuento) * c.itbms_rate, 0);
  const total    = +(subtotal + itbms - (descJubilado ? subtotal*0.15 : 0)).toFixed(2);
  const pagado   = pagos.reduce((a,p)=>a + Number(p.monto||0), 0);
  const pendiente= +(total - pagado).toFixed(2);

  function setPago(idx:number, patch: Partial<PagoItem>) {
    setPagos(prev=>{
      const a=[...prev]; a[idx] = { ...a[idx], ...patch }; return a;
    });
  }
  function addPago() { setPagos(p=>[...p, { metodo:'efectivo', monto:0 }]); }
  function removePago(i:number){ setPagos(p=>p.filter((_,idx)=>idx!==i)); }

  async function cobrar() {
    if (!carrito.length) { alert('Carrito vacío'); return; }
    if (pendiente>0) { alert('Faltan pagos por $'+pendiente.toFixed(2)); return; }

    const payload = {
      company_id: COMPANY_ID,
      branch_id: BRANCH_ID,
      customer_id: null,
      desc_jubilado: descJubilado ? 0.15 : 0,
      items: carrito.map(c=>({
        product_id: c.product_id,
        cantidad: c.cantidad,
        precio_unit: c.precio_unit,
        itbms_rate: c.itbms_rate,
        descuento: c.descuento
      })),
      pagos: pagos.map(p=>({
        metodo: p.metodo,
        monto: Number(p.monto),
        recibido_en: p.recibido_en || new Date().toISOString()
      }))
    };

    const r = await fetch('/api/pos/cobrar', { method:'POST', body: JSON.stringify(payload) });
    const t = await r.text(); let j:any={}; try{ j=JSON.parse(t);}catch{ }
    if (!r.ok) { alert('Error al cobrar:\n'+t); return; }

    // Limpia
    setCarrito([]); setPagos([{ metodo:'efectivo', monto:0 }]);
    alert(
      'Venta OK.' +
      (j.auto_emit_dgi ? ' DGI emitida.' : '') +
      (j.decision ? `\n[Auto-emit: ${j.decision.value ? 'ON':'OFF'}]` : '')
    );
  }

  return (
    <div className="grid md:grid-cols-[1fr_340px] gap-6">
      <div>
        <div className="grid sm:grid-cols-3 gap-3">
          {loading ? <div>Cargando…</div> :
            productos.map(p=>(
              <button key={p.id} onClick={()=>addToCart(p)} className="rounded-2xl border bg-white p-4 text-left">
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
            <div className="w-1/2">{c.nombre}</div>
            <div className="flex items-center gap-2">
              <button onClick={()=>setCarrito(prev=>{ const a=[...prev]; a[idx].cantidad=Math.max(1,a[idx].cantidad-1); return a; })} className="px-2 border rounded">-</button>
              <span>{c.cantidad}</span>
              <button onClick={()=>setCarrito(prev=>{ const a=[...prev]; a[idx].cantidad+=1; return a; })} className="px-2 border rounded">+</button>
            </div>
            <div>${(c.cantidad*c.precio_unit).toFixed(2)}</div>
          </div>
        ))}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={descJubilado} onChange={e=>setDescJubilado(e.target.checked)}/>
          Aplicar descuento Jubilado (15%)
        </label>

        <div className="border-t pt-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>ITBMS</span><span>${itbms.toFixed(2)}</span></div>
          <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>${total.toFixed(2)}</span></div>
        </div>

        <div className="pt-2">
          <div className="font-medium mb-1">Pagos</div>
          {pagos.map((p,idx)=>(
            <div key={idx} className="flex items-center gap-2 mb-2">
              <select value={p.metodo} onChange={e=>setPago(idx,{metodo:e.target.value as any})} className="border rounded px-2 py-1">
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="ach">ACH</option>
              </select>
              <input type="number" step="0.01" value={p.monto} onChange={e=>setPago(idx,{monto:Number(e.target.value)})}
                     placeholder="Monto" className="border rounded px-2 py-1 w-28"/>
              <input type="datetime-local" value={p.recibido_en?.slice(0,16)}
                     onChange={e=>setPago(idx,{recibido_en: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                     className="border rounded px-2 py-1"/>
              {pagos.length>1 && <button onClick={()=>removePago(idx)} className="px-2 border rounded">x</button>}
            </div>
          ))}
          <button onClick={addPago} className="text-sm underline">+ Agregar método de pago</button>

          <div className="flex justify-between mt-2 text-sm">
            <span>Pagado</span><span>${pagado.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Pendiente</span><span>${pendiente.toFixed(2)}</span>
          </div>
        </div>

        <button onClick={cobrar} className="w-full py-3 rounded-2xl bg-amber-300 hover:bg-amber-200 font-medium">
          Cobrar
        </button>
      </div>
    </div>
  );
}
