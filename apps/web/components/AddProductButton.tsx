'use client';

import { useState } from 'react';

type Props = {
  onCreated?: () => Promise<void> | void;
  showFor?: 'admin' | 'any'; // si ya controlas rol fuera, deja 'any'
};

export default function AddProductButton({ onCreated, showFor = 'any' }: Props) {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState(1);
  const [itbms, setItbms] = useState(0);
  const [msg, setMsg] = useState<string>();

  async function crear() {
    setMsg(undefined);
    const res = await fetch('/api/productos/crear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, precio, itbms_rate: itbms, es_insumo: false })
    });
    const txt = await res.text();
    if (!res.ok) { setMsg(txt); return; }
    setOpen(false);
    setNombre(''); setPrecio(1); setItbms(0);
    if (onCreated) await onCreated();
  }

  return (
    <>
      <button className="px-3 py-2 rounded-xl border bg-white" onClick={() => setOpen(true)}>
        + Agregar producto
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-4 w-[380px] space-y-3">
            <div className="font-semibold">Nuevo producto</div>
            <input className="border rounded-xl px-3 py-2 w-full" placeholder="Nombre"
                   value={nombre} onChange={e=>setNombre(e.target.value)} />
            <input type="number" step="0.01" className="border rounded-xl px-3 py-2 w-full" placeholder="Precio"
                   value={precio} onChange={e=>setPrecio(Number(e.target.value||0))} />
            <label className="text-sm">ITBMS</label>
            <select className="border rounded-xl px-3 py-2 w-full"
                    value={itbms} onChange={e=>setItbms(Number(e.target.value))}>
              <option value={0}>0%</option>
              <option value={0.07}>7%</option>
            </select>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded-xl border" onClick={()=>setOpen(false)}>Cancelar</button>
              <button className="px-3 py-2 rounded-xl border" onClick={crear}>Crear</button>
            </div>
            {msg && <div className="text-sm text-rose-600">{msg}</div>}
          </div>
        </div>
      )}
    </>
  );
}
