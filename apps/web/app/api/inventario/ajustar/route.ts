import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest){
  const body = await req.json(); // { p_company, p_branch, p_product, p_lot, p_delta, p_reason }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/rpc/stock_adjust';
  const res = await fetch(url!, {
    method:'POST',
    headers:{
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type':'application/json'
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if(!res.ok) return new NextResponse(text,{status:400});
  return NextResponse.json({ ok:true });
}
