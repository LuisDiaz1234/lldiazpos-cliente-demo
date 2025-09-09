export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!base || !svc) {
    return NextResponse.json({ error: 'Missing env' }, { status: 500 });
  }
  const headers = { apikey: svc, Authorization: `Bearer ${svc}` };

  const out: any = { company_id: COMPANY_ID, sources: {} };

  // 1) Vista unificada
  try {
    const r = await fetch(`${base}/rest/v1/v_company_flags?select=auto_emit_dgi&company_id=eq.${COMPANY_ID}`, { headers, cache:'no-store' });
    out.sources.view = r.status + ' ' + r.statusText;
    out.view = await r.json();
  } catch (e:any) { out.view_err = e?.message || String(e); }

  // 2) company_settings
  try {
    const r = await fetch(`${base}/rest/v1/company_settings?select=auto_emit_dgi&company_id=eq.${COMPANY_ID}`, { headers, cache:'no-store' });
    out.sources.company_settings = r.status + ' ' + r.statusText;
    out.company_settings = await r.json();
  } catch (e:any) { out.company_settings_err = e?.message || String(e); }

  // 3) companies
  try {
    const r = await fetch(`${base}/rest/v1/companies?select=auto_emit_dgi&id=eq.${COMPANY_ID}`, { headers, cache:'no-store' });
    out.sources.companies = r.status + ' ' + r.statusText;
    out.companies = await r.json();
  } catch (e:any) { out.companies_err = e?.message || String(e); }

  return NextResponse.json(out);
}
