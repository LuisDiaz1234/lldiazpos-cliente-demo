import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest){
  const body = await req.json();
  const { p_company, p_branch, p_customer, p_items, p_pagos, p_desc_jubilado, p_session } = body;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/rpc/rpc_process_sale';
  const res = await fetch(url!, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_company, p_branch, p_customer, p_items, p_pagos, p_desc_jubilado, p_session })
  });

  if(!res.ok){
    const t = await res.text();
    return NextResponse.json({ error: t }, { status: 400 });
  }
  const sale_id = await res.json();
  return NextResponse.json({ sale_id });
}
