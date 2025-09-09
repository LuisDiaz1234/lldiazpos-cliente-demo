'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useUserRole } from '@/components/useUserRole';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
type Producto = { id: string; nombre: string; precio: number; activo: boolean; es_insumo: boolean; itbms_rate?: number };

export default function PosPage(){
  const supabase = createClient();
  const { role } = useUserRole(); // muestra botón solo a admin
  const [prods, setProds] = useState<Producto[]>([]);
  const [msg, setMsg]     = useState<string>();

  async function cargar(){
    const { data } = await supabase
      .from('products')
      .select('id,nombre,precio,activo,es_insumo,itbms_rate')
      .eq('company_id', COMPANY_ID)
      .eq('activo', true)
      .eq('es_insumo', false)
      .order('nombre');
    setProds(data || []);
  }
  useEffect(()=>{ cargar(); },[]);

  // Modal simple para crear producto rápido
  const [show, setShow] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre:'', precio: 1.00, itbms_rate: 0.07, es_insumo: false });

  async function crear(){
    setMsg(undefined);
    const res = await fetch('/api/productos/crear', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(nuevo)
    });
    const txt = await res.text();
    if(!res.ok){ setMsg(txt); return; }
    setShow(false);
    setNuevo({ nombre:'', precio:1.00, itbms_rate:0.07, es_insumo:false });
    await cargar();
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="mb-3 flex justify-between items-center">
          <h1 className="text-xl font-semibold">POS</h1>
          {role === 'admin' && (
            <button onClick={()=>setShow(true)} className="px-3 py-2 rounded-xl border bg-white">+ Agregar producto</button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {prods.map(p=>(
            <button key={p.id} className="rounded-2xl border bg-white p-3 text-left">
              <div className="h-20 rounded-xl bg-gray-100 mb-2" />
              <div className="font-medium">{p.nombre}</div>
              <div className="text-xs text-gray-500">${Number(p.precio).toFixed(2)}</div>
            </button>
          ))}
          {prods.length===0 && <div className="text-gray-500">No hay productos vendibles aún.</div>}
        </div>
      </div>

      {/* Tu panel de carrito existente va aquí */}
      <div className="w-96">
        {/* … deja tu carrito actual … */}
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-4 w-[380px] space-y-3">
            <div className="font-semibold">Nuevo producto</div>
            <input className="border rounded-xl px-3 py-2 w-full" placeholder="Nombre"
                   value={nuevo.nombre} onChange={e=>setNuevo(v=>({...v, nombre:e.target.value}))}/>
            <input type="number" step="0.01" className="border rounded-xl px-3 py-2 w-full" placeholder="Precio"
                   value={nuevo.precio} onChange={e=>setNuevo(v=>({...v, precio:Number(e.target.value||0)}))}/>
            <label className="text-sm">ITBMS</label>
            <select className="border rounded-xl px-3 py-2 w-full"
                    value={nuevo.itbms_rate} onChange={e=>setNuevo(v=>({...v, itbms_rate:Number(e.target.value)}))}>
              <option value={0}>0%</option>
              <option value={0.07}>7%</option>
            </select>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded-xl border" onClick={()=>setShow(false)}>Cancelar</button>
              <button className="px-3 py-2 rounded-xl border" onClick={crear}>Crear</button>
            </div>
            {msg && <div className="text-sm text-rose-600">{msg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
