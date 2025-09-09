'use client';

import { useState } from 'react';
import { useUserRole } from '@/components/useUserRole';
import { createClient } from '@/lib/supabaseClient';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';

export default function UsuariosPage(){
  const { role } = useUserRole();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState<'admin'|'cajero'>('cajero');
  const [msg, setMsg] = useState<string>();

  if(role !== 'admin') return <div className="p-6">No autorizado</div>;

  async function invitar(e: React.FormEvent){
    e.preventDefault();
    setMsg(undefined);
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch('/api/admin/members', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${session?.access_token ?? ''}`
      },
      body: JSON.stringify({ email, role: rol, companyId: COMPANY_ID })
    });
    if(!res.ok){ setMsg(await res.text()); return; }
    setMsg('Usuario agregado/actualizado. Pídele que inicie sesión.');
    setEmail('');
  }

  return (
    <div className="max-w-lg p-6 space-y-4">
      <h1 className="text-xl font-semibold">Usuarios de la empresa</h1>
      <form onSubmit={invitar} className="space-y-3">
        <input className="border rounded-xl px-3 py-2 w-full" placeholder="correo@cliente.com"
               value={email} onChange={e=>setEmail(e.target.value)} />
        <select className="border rounded-xl px-3 py-2" value={rol} onChange={e=>setRol(e.target.value as any)}>
          <option value="cajero">Cajero</option>
          <option value="admin">Admin</option>
        </select>
        <button className="px-4 py-2 border rounded-xl">Guardar</button>
        {msg && <div className="text-sm">{msg}</div>}
      </form>
    </div>
  );
}
