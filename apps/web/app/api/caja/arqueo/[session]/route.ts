import { NextRequest, NextResponse } from 'next/server';

type Ctx = { params: { session: string } };

export async function GET(_req: NextRequest, { params }: Ctx){
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const url  = `${base}/rest/v1/rpc/rpc_cash_session_summary`;
  const res  = await fetch(url, {
    method:'POST',
    headers:{
      apikey: svc,
      Authorization: `Bearer ${svc}`,
      'Content-Type':'application/json'
    },
    body: JSON.stringify({ p_session: params.session })
  });
  const txt = await res.text();
  if(!res.ok) return new NextResponse(txt,{status:400});
  return NextResponse.json(JSON.parse(txt));
}
