'use client';

import { useState, useEffect } from 'react';
import { useUserRole } from '@/components/useUserRole';
import { createClient } from '@/lib/supabaseClient';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';

type MemberRow = { email: string; role: 'admin' | 'cajero' };

export default function UsuariosPage() {
  const { role } = useUserRole();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [rol, setRol] = useState<'admin' | 'cajero'>('cajero');
  const [msg, setMsg] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);

  async function cargarMiembros() {
    // Lista simple por correo/rol (lee user_companies y junta con auth.users)
    const { data: uc } = await supabase
      .from('user_companies')
      .select('user_id, role')
      .eq('company_id', COMPANY_ID);

    if (!uc || uc.length === 0) {
      setMembers([]);
      return;
    }

    const ids = uc.map((x) => x.user_id);
    // Trae correos desde auth.users vía RPC integrada de Supabase (view pública auth.users no está expuesta por RLS)
    // Alternativa: usa admin UI; aquí haremos una llamada por cada id (sencilla y suficiente para demo)
    const rows: MemberRow[] = [];
    for (const r of uc) {
      const { data: u } = await supabase
        .from('profiles') // si no tienes email aquí, comentado abajo hay una alternativa
        .select('id, full_name')
        .eq('id', r.user_id)
        .maybeSingle();

      // Si no mantienes email en profiles, muestra solo el id
      rows.push({ email: u?.full_name || r.user_id, role: r.role as 'admin' | 'cajero' });
    }
    setMembers(rows);
  }

  useEffect(() => { cargarMiembros(); }, []);

  if (role !== 'admin') return <div className="p-6">No autorizado</div>;

  async function invitar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(undefined);
    setLoading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ email, role: rol, companyId: COMPANY_ID }),
      });
      const txt = await res.text();
      if (!res.ok) { setMsg(txt); return; }
      setMsg('Usuario agregado/actualizado. Pídele que inicie sesión.');
      setEmail('');
      await cargarMiembros();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Usuarios de la empresa</h1>

      <form onSubmit={invitar} className="rounded-2xl border p-4 space-y-3 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="border rounded-xl px-3 py-2 w-full"
            placeholder="correo@cliente.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
          />
          <select
            className="border rounded-xl px-3 py-2"
            value={rol}
            onChange={(e) => setRol(e.target.value as any)}
          >
            <option value="cajero">Cajero</option>
            <option value="admin">Admin</option>
          </select>
          <button
            className="px-4 py-2 border rounded-xl"
            disabled={loading}
          >
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
        {msg && <div className="text-sm">{msg}</div>}
        <div className="text-xs text-gray-500">
          Nota: El usuario debe haber iniciado sesión al menos una vez para que exista en Auth.
        </div>
      </form>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Usuario</th>
              <th className="p-2 text-left">Rol</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{m.email}</td>
                <td className="p-2">{m.role}</td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={2}>
                  Sin usuarios aún
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Si prefieres ver el email real, crea/llena profiles con un campo email o
          monta una pequeña RPC para consultar auth.users.email desde el server.
          Para demo, usamos profiles.full_name o el user_id. */}
    </div>
  );
}
