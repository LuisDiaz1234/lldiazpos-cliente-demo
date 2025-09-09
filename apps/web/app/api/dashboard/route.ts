export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

export async function GET(req: NextRequest) {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = { apikey: svc, Authorization: `Bearer ${svc}` };

    const dateParam = req.nextUrl.searchParams.get('date'); // YYYY-MM-DD
    const day = dateParam || new Date().toISOString().slice(0,10);

    // KPI ventas
    const kpiRes = await fetch(
      `${base}/rest/v1/v_dashboard_day?company_id=eq.${COMPANY_ID}&branch_id=eq.${BRANCH_ID}&dia=eq.${day}`,
      { headers, cache: 'no-store' }
    );
    const kpi = await kpiRes.json();
    const k = Array.isArray(kpi) && kpi[0] ? kpi[0] : { ventas_count:0, ventas_total:0, itbms_total:0 };

    // Pagos por método
    const payRes = await fetch(
      `${base}/rest/v1/v_payments_by_day_method?company_id=eq.${COMPANY_ID}&branch_id=eq.${BRANCH_ID}&dia=eq.${day}`,
      { headers, cache: 'no-store' }
    );
    const pagos = await payRes.json();

    return NextResponse.json({ day, kpi: k, pagos });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
