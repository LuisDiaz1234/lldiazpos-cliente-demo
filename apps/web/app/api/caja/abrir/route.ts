import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest){
  const { p_company, p_branch } = await req.json();

  if(!p_company || !p_branch){
    return NextResponse.json({ error: 'Faltan p_company/p_branch' }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Usa ensure_open_cash_session => si ya hay abierta, la reusa; si no, la crea
  const res = await fetch(`${base}/rest/v1/rpc/ensure_open_cash_session`, {
    method:'POST',
    headers:{ apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ p_company, p_branch }),
    cache: 'no-store'
  });

  const txt = await res.text();
  if(!res.ok) return new NextResponse(txt, { status: 400 });

  return NextResponse.json({ session_id: JSON.parse(txt) });
}
