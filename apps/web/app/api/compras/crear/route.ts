export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

export async function POST(req: NextRequest) {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' as const };

    const body = await req.json();
    const supplier_id = body.supplier_id;
    const items = body.items || [];

    const r = await fetch(`${base}/rest/v1/rpc/rpc_process_purchase`, {
      method: 'POST', headers,
      body: JSON.stringify({
        p_company: COMPANY_ID,
        p_branch: BRANCH_ID,
        p_supplier: supplier_id,
        p_items: items
      })
    });
    const t = await r.text(); let j:any={}; try{ j=JSON.parse(t);}catch{}
    if (!r.ok) return new NextResponse(t, { status: r.status||400 });

    return NextResponse.json({ ok:true, purchase_id: j });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
