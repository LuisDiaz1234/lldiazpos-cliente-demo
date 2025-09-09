export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';

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
    const adminHeaders = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' as const };

    const body = await req.json();
    const company_id: string = body.company_id || COMPANY_ID;
    const sale_id:   string = body.sale_id || body.venta_id;

    if (!sale_id) return NextResponse.json({ error: 'sale_id (o venta_id) es requerido' }, { status: 400 });

    // Genera folio/QR DEMO (sustituye aquí por tu proveedor real)
    const folio  = makeDemoFolio();
    const qr_url = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(folio)}`;

    // Marca venta como emitida
    const upd = await fetch(`${base}/rest/v1/sales?id=eq.${sale_id}`, {
      method: 'PATCH', headers: adminHeaders,
      body: JSON.stringify({ dgi_status: 'emitida', dgi_folio: folio, dgi_qr: qr_url })
    });
    const updTxt = await upd.text();
    if (!upd.ok) return new NextResponse(updTxt || 'No se pudo actualizar venta', { status: 400 });

    // Upsert en invoices (por si tu /facturas lista desde aquí)
    const ins = await fetch(`${base}/rest/v1/invoices`, {
      method: 'POST', headers: adminHeaders,
      body: JSON.stringify([{ company_id, sale_id, folio, status: 'emitida', qr_url }])
    });
    if (!ins.ok) {
      await fetch(`${base}/rest/v1/invoices?sale_id=eq.${sale_id}`, {
        method: 'PATCH', headers: adminHeaders,
        body: JSON.stringify({ folio, status: 'emitida', qr_url })
      });
    }

    return NextResponse.json({ ok: true, folio, qr_url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
