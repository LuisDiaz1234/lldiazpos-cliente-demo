export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

/** DEMO: auto-emite DGI siempre después de cobrar (pon en false si no quieres) */
const FORCE_AUTO_EMIT = true;

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

export async function POST(req: NextRequest) {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!base || !svc) {
      return NextResponse.json({ error: 'Faltan variables de entorno de Supabase' }, { status: 500 });
    }
    const admin = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' as const };

    // -------- 1) payload POS --------
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

    // -------- 2) caja abierta --------
    const qs = new URLSearchParams({
      select: 'id', order: 'apertura.desc', limit: '1',
      'company_id': `eq.${company}`, 'branch_id': `eq.${branch}`, 'cierre': 'is.null'
    });
    const sesRes = await fetch(`${base}/rest/v1/cash_sessions?${qs}`, { headers: admin });
    const ses = await sesRes.json();
    const session_id = Array.isArray(ses) && ses[0]?.id ? ses[0].id : null;
    if (!session_id) return NextResponse.json({ error: 'No hay caja abierta.' }, { status: 400 });

    // -------- 3) RPC procesar venta --------
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

    // -------- 4) Auto-emisión DGI (inline, sin llamar otra API) --------
    let invoice: any = null;
    if (FORCE_AUTO_EMIT && sale_id) {
      try {
        // Generar folio/QR DEMO (sustituye aquí por proveedor real)
        const folio  = makeDemoFolio();
        const qr_url = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(folio)}`;

        // a) marcar venta emitida
        const upd = await fetch(`${base}/rest/v1/sales?id=eq.${sale_id}`, {
          method: 'PATCH', headers: admin,
          body: JSON.stringify({ dgi_status: 'emitida', dgi_folio: folio, dgi_qr: qr_url })
        });
        const updTxt = await upd.text();
        if (!upd.ok) throw new Error(updTxt || 'No se pudo actualizar venta');

        // b) upsert en invoices (por si la UI lista desde esta tabla)
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
    }

    // -------- 5) respuesta --------
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
