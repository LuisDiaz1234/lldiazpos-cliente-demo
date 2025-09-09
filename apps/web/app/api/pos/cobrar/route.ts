export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

async function getJsonSafe(res: Response) {
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text), raw: text }; }
  catch { return { ok: res.ok, status: res.status, data: null as any, raw: text }; }
}

export async function POST(req: NextRequest) {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!base || !svc) {
      return NextResponse.json({ error: 'Faltan variables de entorno de Supabase' }, { status: 500 });
    }
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

    // 1) Buscar caja abierta
    const qs = new URLSearchParams({
      select: 'id',
      order: 'apertura.desc',
      limit: '1',
      'company_id': `eq.${company}`,
      'branch_id':  `eq.${branch}`,
      'cierre':     'is.null'
    });
    const sesRes = await fetch(`${base}/rest/v1/cash_sessions?${qs}`, { headers });
    const sesJson = await sesRes.json();
    const session_id = Array.isArray(sesJson) && sesJson[0]?.id ? sesJson[0].id : null;
    if (!session_id) return NextResponse.json({ error: 'No hay caja abierta.' }, { status: 400 });

    // 2) Ejecutar RPC de venta
    const rpcName = 'rpc_process_sale'; // ajusta si tu wrapper tiene otro nombre
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
    const sale = await getJsonSafe(saleRes);
    if (!sale.ok) {
      return new NextResponse(sale.raw || 'Error al procesar venta', { status: sale.status || 400 });
    }

    // La RPC puede devolver { new_sale_id } o similar. Normalizamos:
    const saleId =
      sale.data?.new_sale_id ||
      sale.data?.sale_id ||
      sale.data?.id ||
      (typeof sale.data === 'string' ? sale.data : null);

    // 3) Leer config de auto-emisión
    let auto = false;
    try {
      const cfgRes = await fetch(
        `${base}/rest/v1/company_settings?select=auto_emit_dgi&company_id=eq.${company}`,
        { headers }
      );
      const cfg = await cfgRes.json();
      auto = Array.isArray(cfg) && cfg[0]?.auto_emit_dgi === true;
    } catch { /* si falla, mantenemos auto=false */ }

    let invoiceResult: any = null;

    // 4) Auto-emite si aplica (usamos tu API interna /api/facturas/emitir)
    if (auto && saleId) {
      const emitirRes = await fetch(`${new URL(req.url).origin}/api/facturas/emitir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale_id: saleId, company_id: company })
      });
      const emitir = await getJsonSafe(emitirRes);
      if (!emitir.ok) {
        // No bloquea la venta; devolvemos warning
        invoiceResult = { ok: false, error: emitir.raw || 'Fallo al emitir DGI' };
      } else {
        invoiceResult = { ok: true, ...emitir.data };
      }
    }

    return NextResponse.json({
      ok: true,
      sale: sale.data ?? sale.raw,
      sale_id: saleId,
      auto_emit_dgi: auto,
      invoice: invoiceResult
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
