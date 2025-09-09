export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

export async function POST(req: NextRequest) {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' as const };

    const payload = await req.json();
    const company = payload.company_id || COMPANY_ID;
    const branch  = payload.branch_id  || BRANCH_ID;
    const customer = payload.customer_id || null;
    const desc_jub = Number(payload.desc_jubilado || 0);
    const items = Array.isArray(payload.items) ? payload.items : [];
    const pagos = Array.isArray(payload.pagos) ? payload.pagos : [];
    if (items.length === 0 || pagos.length === 0) {
      return NextResponse.json({ error: 'Items y pagos son requeridos' }, { status: 400 });
    }

    // Caja abierta
    const qs = new URLSearchParams({
      select: 'id',
      order: 'apertura.desc',
      limit: '1',
      'company_id': `eq.${company}`,
      'branch_id':  `eq.${branch}`,
      'cierre':     'is.null'
    });
    const sesRes = await fetch(`${base}/rest/v1/cash_sessions?${qs}`, { headers });
    const js = await sesRes.json();
    const session_id = Array.isArray(js) && js[0]?.id ? js[0].id : null;
    if (!session_id) return NextResponse.json({ error: 'No hay caja abierta.' }, { status: 400 });

    // Llama tu RPC
    const rpcName = 'rpc_process_sale';
    const body = {
      p_company: company,
      p_branch: branch,
      p_customer: customer,
      p_desc_jubilado: desc_jub,
      p_items: items,
      p_pagos: pagos,
      p_session: session_id
    };
    const res = await fetch(`${base}/rest/v1/rpc/${rpcName}`, {
      method: 'POST', headers, body: JSON.stringify(body)
    });
    const txt = await res.text();
    if (!res.ok) return new NextResponse(txt || 'Error al procesar venta', { status: 400 });

    let data: any = {};
    try { data = JSON.parse(txt); } catch {}
    return NextResponse.json({ ok: true, result: data || txt });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
