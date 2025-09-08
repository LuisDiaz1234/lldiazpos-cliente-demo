'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const supabase = createClient();
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message); else window.location.href = '/dashboard';
  }
  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow">
      <h1 className="text-xl font-semibold mb-4">Iniciar sesión</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border rounded-xl px-3 py-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border rounded-xl px-3 py-2" type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-3 py-2">Entrar</button>
      </form>
    </div>
  );
}
