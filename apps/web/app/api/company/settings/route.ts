export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!base || !svc) return NextResponse.json({ error: 'Missing env' }, { status: 500 });

  const headers = { apikey: svc, Authorization: `Bearer ${svc}` };
  // lee desde la vista unificada (si existe) o cae a company_settings
  let row: any = null;
  try {
    const r = await fetch(`${base}/rest/v1/v_company_flags?select=auto_emit_dgi,dgi_modo&company_id=eq.${COMPANY_ID}`, { headers });
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j) && j[0]) row = j[0];
    }
  } catch {}
  if (!row) {
    const r = await fetch(`${base}/rest/v1/company_settings?select=auto_emit_dgi,dgi_modo&company_id=eq.${COMPANY_ID}`, { headers });
    const j = await r.json();
    row = (Array.isArray(j) && j[0]) ? j[0] : { auto_emit_dgi:false, dgi_modo:'sandbox' };
  }
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!base || !svc) return NextResponse.json({ error: 'Missing env' }, { status: 500 });

  const { auto_emit_dgi, dgi_modo } = await req.json();
  const headers = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' as const };
  const value = !!auto_emit_dgi;
  const modo  = dgi_modo || 'sandbox';

  // A) upsert en company_settings
  const body = [{ company_id: COMPANY_ID, auto_emit_dgi: value, dgi_modo: modo, updated_at: new Date().toISOString() }];
  const r = await fetch(`${base}/rest/v1/company_settings`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!r.ok) {
    await fetch(`${base}/rest/v1/company_settings?company_id=eq.${COMPANY_ID}`, {
      method: 'PATCH', headers, body: JSON.stringify(body[0])
    });
  }

  // B) sincroniza también en companies
  await fetch(`${base}/rest/v1/companies?id=eq.${COMPANY_ID}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ auto_emit_dgi: value })
  });

  return NextResponse.json({ ok: true });
}
