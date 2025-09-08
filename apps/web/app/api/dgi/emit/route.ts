import { NextRequest, NextResponse } from 'next/server';

/**
 * Variables de entorno que debes configurar en Vercel:
 * - DGI_MODE = "mock" | "real"   (por defecto mock si no está)
 * - DGI_PROVIDER_URL = https://... (solo en modo real)
 * - DGI_API_KEY = <token del proveedor> (solo en modo real)
 *
 * Flujo:
 * 1) crea/asegura invoice "pendiente" para sale_id
 * 2) obtiene payload desde invoices.payload (si no existe, lo crea con dgi_build_payload)
 * 3) si DGI_MODE=mock -> responde con folio/uuid/qr simulados
 *    si DGI_MODE=real -> hace POST al proveedor y parsea respuesta
 * 4) actualiza invoices con dgi_update_invoice
 */

export async function POST(req: NextRequest) {
  try {
    const { sale_id } = await req.json();
    if (!sale_id) return NextResponse.json({ error: 'Falta sale_id' }, { status: 400 });

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // 1) asegura invoice
    const mk = await fetch(`${base}/rest/v1/rpc/dgi_create_invoice`, {
      method: 'POST',
      headers: {
        apikey: svc,
        Authorization: `Bearer ${svc}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_sale: sale_id }),
    });
    if (!mk.ok) {
      const t = await mk.text();
      return NextResponse.json({ error: `dgi_create_invoice: ${t}` }, { status: 400 });
    }
    const invoice_id: string = await mk.json();

    // 2) obtener payload + datos de invoice
    const iv = await fetch(`${base}/rest/v1/invoices?id=eq.${invoice_id}&select=id,payload`, {
      headers: { apikey: svc, Authorization: `Bearer ${svc}` },
      cache: 'no-store',
    });
    const arr = await iv.json();
    const payload = arr?.[0]?.payload || null;
    if (!payload) {
      return NextResponse.json({ error: 'payload vacío en invoice' }, { status: 400 });
    }

    // 3) mock o real
    const mode = (process.env.DGI_MODE || 'mock').toLowerCase();
    let folio = '';
    let dgi_uuid = '';
    let qr_url = '';
    let providerResp: any = null;
    let status = 'emitida';
    let error: string | null = null;

    if (mode === 'mock') {
      folio = `SERIE-${Date.now()}`;
      dgi_uuid = crypto.randomUUID();
      qr_url = `https://dgi.gob.pa/consulta?folio=${encodeURIComponent(folio)}`;
      providerResp = { mode: 'mock', ok: true, folio, dgi_uuid, qr_url };
    } else {
      const url = process.env.DGI_PROVIDER_URL!;
      const key = process.env.DGI_API_KEY!;
      const upstream = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(payload),
      });
      const bodyText = await upstream.text();
      let body: any = {};
      try { body = JSON.parse(bodyText); } catch { body = { raw: bodyText }; }

      providerResp = body;

      if (!upstream.ok) {
        status = 'rechazada';
        error = `Proveedor devolvió ${upstream.status}: ${bodyText}`;
      } else {
        // ajusta estos paths a la respuesta real del proveedor:
        folio = body.folio || body.numero || '';
        dgi_uuid = body.uuid || body.id || '';
        qr_url = body.qr_url || body.qr || '';
        if (!folio || !dgi_uuid) {
          status = 'rechazada';
          error = 'Respuesta del proveedor sin folio/uuid';
        }
      }
    }

    // 4) actualiza invoice
    const upd = await fetch(`${base}/rest/v1/rpc/dgi_update_invoice`, {
      method: 'POST',
      headers: {
        apikey: svc,
        Authorization: `Bearer ${svc}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_invoice: invoice_id,
        p_status: status,
        p_folio: folio,
        p_uuid: dgi_uuid,
        p_qr: qr_url,
        p_provider_resp: providerResp,
        p_error: error,
      }),
    });

    if (!upd.ok) {
      const t = await upd.text();
      return NextResponse.json({ error: `dgi_update_invoice: ${t}` }, { status: 400 });
    }

    if (status !== 'emitida') {
      return NextResponse.json({ error: error || 'Factura rechazada' }, { status: 400 });
    }

    return NextResponse.json({ invoice_id, folio, dgi_uuid, qr_url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
