export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

type FetchRes = { ok: boolean; status: number; data: any; raw: string };

async function toJson(res: Response): Promise<FetchRes> {
  const raw = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(raw), raw }; }
  catch { return { ok: res.ok, status: res.status, data: null, raw }; }
}

async function readAutoFlag(base: string, headers: Record<string,string>, company: string): Promise<boolean> {
  // 1) company_settings
  try {
    const r1 = await fetch(`${base}/rest/v1/company_settings?select=auto_emit_dgi&company_id=eq.${company}`, { headers });
    const j1 = await r1.json();
    if (Array.isArray(j1) && j1[0]?.auto_emit_dgi === true) return true;
  } catch {}
  // 2) companies
  try {
    const r2 = await fetch(`${base}/rest/v1/companies?select=auto_emit_dgi&id=eq.${company}`, { headers });
    const j2 = await r2.json();
    if (Array.isArray(j2) && j2[0]?.auto_emit_dgi === true) return true;
  } catch {}
  // 3) company_config
  try {
    const r3 = await fetch(`${base}/rest/v1/company_config?select=auto_emit_dgi&company_id=eq.${company}`, { headers });
    const j3 = await r3.json();
    if (Array.isArray(j3) && j3[0]?.auto_emit_dgi === true) return true;
  } catch {}
  return false;
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

    // 1) Caja abierta
    const qs = new URLSearchParams({
      select: 'id',
      order: 'apertura.desc',
      limit: '1',
      'company_id': `eq.${company}`,
      'branch_id':  `eq.${branch}`,
      'cierre':     'is.null'
    });
    const sesRes = await fetch(`${base}/rest/v1/cash_sessions?${qs}`, { headers });
    const ses = await sesRes.json();
    const session_id = Array.isArray(ses) && ses[0]?.id ? ses[0].id : null;
    if (!session_id) return NextResponse.json({ error: 'No hay caja abierta.' }, { status: 400 });

    // 2) RPC de venta
    const rpcName = 'rpc_process_sale'; // ajusta si tu wrapper se llama distinto
    const body = {
      p_company: company,
      p_branch: branch,
      p_customer: customer,
      p_desc_jubilado: desc_jub,
      p_items: items,
      p_pagos: pagos,
      p_session: session_id
    };
    const saleRes = await fetch(`${base}/rest/v1/rpc/${rpcName}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const sale = await toJson(saleRes);
    if (!sale.ok) return new NextResponse(sale.raw || 'Error al procesar venta', { status: sale.status || 400 });

    const saleId =
      sale.data?.new_sale_id ||
      sale.data?.sale_id ||
      sale.data?.id ||
      (typeof sale.data === 'string' ? sale.data : null);

    // 3) ¿Auto-emisión activa?
    const auto = await readAutoFlag(base, headers, company);
    let invoiceAttempt: 'none'|'emitir_sale_id'|'emitir_venta_id'|'rpc_emit' = 'none';
    let invoiceResult: any = null;

    if (auto && saleId) {
      // 3a) intenta /api/facturas/emitir con sale_id
      try {
        invoiceAttempt = 'emitir_sale_id';
        const r1 = await fetch(`${new URL(req.url).origin}/api/facturas/emitir`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sale_id: saleId, company_id: company })
        });
        const j1 = await toJson(r1);
        if (j1.ok) invoiceResult = { ok: true, try: invoiceAttempt, data: j1.data };
        else {
          // 3b) reintenta con venta_id (algunas rutas lo esperan así)
          invoiceAttempt = 'emitir_venta_id';
          const r2 = await fetch(`${new URL(req.url).origin}/api/facturas/emitir`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ venta_id: saleId, company_id: company })
          });
          const j2 = await toJson(r2);
          if (j2.ok) invoiceResult = { ok: true, try: invoiceAttempt, data: j2.data };
          else {
            // 3c) última opción: RPC directa en Supabase
            try {
              invoiceAttempt = 'rpc_emit';
              const r3 = await fetch(`${base}/rest/v1/rpc/rpc_emit_invoice`, {
                method: 'POST', headers,
                body: JSON.stringify({ p_company: company, p_sale: saleId })
              });
              const j3 = await toJson(r3);
              if (j3.ok) invoiceResult = { ok: true, try: invoiceAttempt, data: j3.data };
              else invoiceResult = { ok: false, try: invoiceAttempt, error: j3.raw };
            } catch (e: any) {
              invoiceResult = { ok: false, try: invoiceAttempt, error: e?.message || String(e) };
            }
          }
        }
      } catch (e: any) {
        invoiceResult = { ok: false, try: invoiceAttempt, error: e?.message || String(e) };
      }
    }

    return NextResponse.json({
      ok: true,
      sale_id: saleId,
      sale: sale.data ?? sale.raw,
      auto_emit_dgi: auto,
      invoice: invoiceResult
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
