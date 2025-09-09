import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest){
  const { email, role, companyId } = await req.json();
  if(!email || !role || !companyId){
    return NextResponse.json({ error: 'Faltan email/role/companyId' }, { status: 400 });
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // usamos sesión del usuario (RLS)
  // Tomamos el JWT de cliente (para que RLS evalúe is_admin)
  const auth = req.headers.get('authorization') || '';

  const res = await fetch(`${base}/rest/v1/rpc/rpc_upsert_member`, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: auth,           // ⬅️ usa token del usuario autenticado
      'Content-Type':'application/json',
      'Cache-Control':'no-store',
    },
    body: JSON.stringify({ p_company: companyId, p_email: email, p_role: role }),
    cache: 'no-store'
  });

  const text = await res.text();
  if(!res.ok) return new NextResponse(text, { status: 400 });
  return NextResponse.json({ ok: true });
}
