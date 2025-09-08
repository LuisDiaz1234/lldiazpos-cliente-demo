// apps/web/app/api/caja/arqueo/[session]/route.ts
export const dynamic = 'force-dynamic';   // ⬅️ evita ISR/edge cache para este route
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

type Ctx = { params: { session: string } };

export async function GET(_req: NextRequest, { params }: Ctx){
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const url  = `${base}/rest/v1/rpc/rpc_cash_session_summary`;

  const res = await fetch(url, {
    method:'POST',
    headers:{
      apikey: svc,
      Authorization: `Bearer ${svc}`,
      'Content-Type':'application/json',
      // ⬇️ redundante pero útil si el host intermedio cachea
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify({ p_session: params.session }),
    cache: 'no-store'  // ⬅️ evita cache del fetch interno de Next
  });

  const txt = await res.text();
  if(!res.ok) {
    return new NextResponse(txt, {
      status: 400,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  return new NextResponse(txt, {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
