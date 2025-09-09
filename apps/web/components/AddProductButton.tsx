'use client';
import { useState } from 'react';

type Props = {
  esInsumo: boolean;               // true = insumo (inventario), false = vendible (POS)
  onCreated?: () => void | Promise<void>;
};

export default function AddProductButton({ esInsumo, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState(1);
  const [itbms, setItbms] = useState(0);
  const [unidad, setUnidad] = useState('unidad');
  const [msg, setMsg] = useState<string>();

  async function crear() {
    setMsg(undefined);
    try {
      const url = esInsumo ? '/api/insumos/crear' : '/api/productos/crear';
      const body = esInsumo
        ? { nombre, unidad_default: unidad }
        : { nombre, precio, itbms_rate: itbms };

      const res = await fetch(url, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(body)
      });
      const t = await res.text();
      if (!res.ok) { setMsg(t); return; }
      setOpen(false); setNombre(''); setPrecio(1); setItbms(0); setUnidad('unidad');
      if (onCreated) await onCreated();
    } catch (e:any) {
      setMsg(e?.message || String(e));
    }
  }

  return (
    <>
      <button className="px-3 py-2 rounded-xl border bg-white" onClick={()=>setOpen(true)}>
        + Agregar producto
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-4 w-[380px] space-y-3">
            <div className="font-semibold">{esInsumo ? 'Nuevo insumo' : 'Nuevo producto vendible'}</div>
            <input className="border rounded-xl px-3 py-2 w-full" placeholder="Nombre"
                   value={nombre} onChange={e=>setNombre(e.target.value)} />
            {esInsumo ? (
              <select className="border rounded-xl px-3 py-2 w-full"
                      value={unidad} onChange={e=>setUnidad(e.target.value)}>
                <option value="unidad">unidad</option><option value="gr">gr</option>
                <option value="kg">kg</option><option value="ml">ml</option><option value="l">l</option>
                <option value="pieza">pieza</option>
              </select>
            ) : (
              <>
                <input type="number" step="0.01" className="border rounded-xl px-3 py-2 w-full" placeholder="Precio"
                       value={precio} onChange={e=>setPrecio(Number(e.target.value||0))} />
                <select className="border rounded-xl px-3 py-2 w-full"
                        value={itbms} onChange={e=>setItbms(Number(e.target.value))}>
                  <option value={0}>ITBMS 0%</option>
                  <option value={0.07}>ITBMS 7%</option>
                </select>
              </>
            )}
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded-xl border" onClick={()=>setOpen(false)}>Cancelar</button>
              <button className="px-3 py-2 rounded-xl border" onClick={crear}>Crear</button>
            </div>
            {msg && <div className="text-sm text-rose-600 break-all">{msg}</div>}
          </div>
        </div>
      )}
    </>
  );
}
