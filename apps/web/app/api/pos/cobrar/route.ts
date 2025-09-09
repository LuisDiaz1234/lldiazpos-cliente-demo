export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

/** For demo: fuerza auto-emisión después de cobrar */
const FORCE_AUTO_EMIT = true; // ← pon en false si no quieres auto-emitir

async function toJson(res: Response) {
  const raw = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(raw), raw }; }
  catch { return { ok: res.ok, status: res.status, data: null, raw }; }
}

export async function POST(req: NextRequest) {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!base || !svc) return NextResponse.json({ error: 'Faltan variables de entorno' }, { status: 500 });
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

    // 1) Caja abierta
    const qs = new URLSearchParams({
      select: 'id', order: 'apertura.desc', limit: '1',
      'company_id': `eq.${company}`, 'branch_id': `eq.${branch}`, 'cierre': 'is.null'
    });
    const sesRes = await fetch(`${base}/rest/v1/cash_sessions?${qs}`, { headers });
    const ses = await sesRes.json();
    const session_id = Array.isArray(ses) && ses[0]?.id ? ses[0].id : null;
    if (!session_id) return NextResponse.json({ error: 'No hay caja abierta.' }, { status: 400 });

    // 2) RPC de venta
    const rpcName = 'rpc_process_sale'; // ajusta si tu wrapper usa otro nombre
    const body = {
      p_company: company,
      p_branch: branch,
      p_customer: customer,
      p_desc_jubilado: desc_jub,
      p_items: items,
      p_pagos: pagos,
      p_session: session_id
    };
    const saleRes = await fetch(`${base}/rest/v1/rpc/${rpcName}`, {
      method: 'POST', headers, body: JSON.stringify(body)
    });
    const sale = await toJson(saleRes);
    if (!sale.ok) return new NextResponse(sale.raw || 'Error al procesar venta', { status: sale.status || 400 });

    const sale_id =
      sale.data?.new_sale_id || sale.data?.sale_id || sale.data?.id ||
      (typeof sale.data === 'string' ? sale.data : null);

    // 3) Auto-emisión DGI (forzado para demo)
    let invoice: any = null;
    if (FORCE_AUTO_EMIT && sale_id) {
      const origin = new URL(req.url).origin;
      const emRes = await fetch(`${origin}/api/facturas/emitir`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company, sale_id })
      });
      const em = await toJson(emRes);
      invoice = em.ok ? { ok: true, data: em.data } : { ok: false, error: em.raw };
    }

    return NextResponse.json({
      ok: true,
      sale_id,
      auto_emit_dgi: FORCE_AUTO_EMIT,
      invoice
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
