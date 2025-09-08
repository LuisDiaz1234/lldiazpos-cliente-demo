import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest){
  const { p_company, p_branch, p_date } = await req.json();
  if(!p_company || !p_branch || !p_date) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const url  = `${base}/rest/v1/rpc/rpc_daily_summary`;
  const res  = await fetch(url, {
    method:'POST',
    headers:{
      apikey: svc,
      Authorization: `Bearer ${svc}`,
      'Content-Type':'application/json'
    },
    body: JSON.stringify({ p_company, p_branch, p_date })
  });
  const txt = await res.text();
  if(!res.ok) return new NextResponse(txt,{status:400});
  return NextResponse.json(JSON.parse(txt));
}
