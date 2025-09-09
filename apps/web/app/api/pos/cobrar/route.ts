export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

type J = { ok:boolean; status:number; data:any; raw:string };
async function toJson(res: Response): Promise<J> {
  const raw = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(raw), raw }; }
  catch { return { ok: res.ok, status: res.status, data: null, raw }; }
}

function makeDemoFolio() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const y = new Date().getFullYear();
  return `FOL-${y}-${rand}`;
}

/** Lee desde la vista unificada v_company_flags; cae a tablas si no existe */
async function readAutoFlag(base: string, admin: Record<string,string>, company: string) {
  try {
    const r = await fetch(`${base}/rest/v1/v_company_flags?select=auto_emit_dgi&company_id=eq.${company}`, { headers: admin, cache:'no-store' });
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j) && j[0]) return { source: 'view', value: j[0].auto_emit_dgi === true };
    }
  } catch {}
  try {
    const r = await fetch(`${base}/rest/v1/company_settings?select=auto_emit_dgi&company_id=eq.${company}`, { headers: admin, cache:'no-store' });
    const j = await r.json();
    if (Array.isArray(j) && j[0]) return { source: 'company_settings', value: j[0].auto_emit_dgi === true };
  } catch {}
  try {
    const r = await fetch(`${base}/rest/v1/companies?select=auto_emit_dgi&id=eq.${company}`, { headers: admin, cache:'no-store' });
    const j = await r.json();
    if (Array.isArray(j) && j[0]) return { source: 'companies', value: j[0].auto_emit_dgi === true };
  } catch {}
  return { source: 'default(false)', value: false };
}

export async function POST(req: NextRequest) {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!base || !svc) return NextResponse.json({ error: 'Faltan env de Supabase' }, { status: 500 });
    const admin = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' as const };

    const payload = await req.json();
    const company = payload.company_id || COMPANY_ID;
    const branch  = payload.branch_id  || BRANCH_ID;
    const customer = payload.customer_id || null;
    const desc_jub = Number(payload.desc_jubilado || 0);
    const items = Array.isArray(payload.items) ? payload.items : [];
    const pagos = Array.isArray(payload.pagos) ? payload.pagos : [];
    if (!items.length || !pagos.length) {
      return NextResponse.json({ error: 'Items y pagos son requeridos' }, { status: 400 });
    }

    // Caja abierta
    const qs = new URLSearchParams({
      select: 'id', order: 'apertura.desc', limit: '1',
      'company_id': `eq.${company}`, 'branch_id': `eq.${branch}`, 'cierre': 'is.null'
    });
    const sesRes = await fetch(`${base}/rest/v1/cash_sessions?${qs}`, { headers: admin });
    const ses = await sesRes.json();
    const session_id = Array.isArray(ses) && ses[0]?.id ? ses[0].id : null;
    if (!session_id) return NextResponse.json({ error: 'No hay caja abierta.' }, { status: 400 });

    // RPC venta
    const rpcBody = {
      p_company: company,
      p_branch: branch,
      p_customer: customer,
      p_desc_jubilado: desc_jub,
      p_items: items,
      p_pagos: pagos,
      p_session: session_id
    };
    const saleRes = await fetch(`${base}/rest/v1/rpc/rpc_process_sale`, {
      method: 'POST', headers: admin, body: JSON.stringify(rpcBody)
    });
    const sale = await toJson(saleRes);
    if (!sale.ok) return new NextResponse(sale.raw || 'Error al procesar venta', { status: sale.status || 400 });

    const sale_id =
      sale.data?.new_sale_id || sale.data?.sale_id || sale.data?.id ||
      (typeof sale.data === 'string' ? sale.data : null);

    // LEE FLAG
    const flag = await readAutoFlag(base, admin, company);
    const shouldEmit = !!sale_id && flag.value === true;

    // COMPuERTA: si está OFF, ni lo intentes (y la BD también lo bloquea)
    if (!shouldEmit) {
      return NextResponse.json({
        ok: true,
        sale_id,
        decision: { source: flag.source, value: flag.value },
        auto_emit_dgi: false,
        invoice: null
      });
    }

    // Emitir inline
    let invoice: any = null;
    try {
      const folio  = makeDemoFolio();
      const qr_url = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(folio)}`;

      const upd = await fetch(`${base}/rest/v1/sales?id=eq.${sale_id}`, {
        method: 'PATCH', headers: admin,
        body: JSON.stringify({ dgi_status: 'emitida', dgi_folio: folio, dgi_qr: qr_url })
      });
      const updTxt = await upd.text();
      if (!upd.ok) throw new Error(updTxt || 'No se pudo actualizar venta');

      const ins = await fetch(`${base}/rest/v1/invoices`, {
        method: 'POST', headers: admin,
        body: JSON.stringify([{ company_id: company, sale_id, folio, status: 'emitida', qr_url }])
      });
      if (!ins.ok) {
        await fetch(`${base}/rest/v1/invoices?sale_id=eq.${sale_id}`, {
          method: 'PATCH', headers: admin,
          body: JSON.stringify({ folio, status: 'emitida', qr_url })
        });
      }

      invoice = { ok: true, folio, qr_url };
    } catch (e:any) {
      invoice = { ok: false, error: e?.message || String(e) };
    }

    return NextResponse.json({
      ok: true,
      sale_id,
      decision: { source: flag.source, value: flag.value },
      auto_emit_dgi: true,
      invoice
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
