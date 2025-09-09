export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

export async function POST(req: NextRequest) {
  try {
    const { product_id, cantidad, unidad, lote, vence, motivo } = await req.json();
    if (!product_id || !cantidad) return NextResponse.json({ error: 'product_id y cantidad son requeridos' }, { status: 400 });

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' as const };

    const lot = {
      id        : crypto.randomUUID(),
      company_id: COMPANY_ID,
      branch_id : BRANCH_ID,
      product_id,
      lote      : lote || null,
      vencimiento: vence || null,
      cantidad  : Number(cantidad),
      unit      : unidad || 'unidad'
    };

    const insLot = await fetch(`${base}/rest/v1/stock_lots`, {
      method: 'POST', headers, body: JSON.stringify([lot])
    });
    if (!insLot.ok) return new NextResponse(await insLot.text(), { status: 400 });

    const insMove = await fetch(`${base}/rest/v1/stock_moves`, {
      method: 'POST', headers,
      body: JSON.stringify([{
        id        : crypto.randomUUID(),
        company_id: COMPANY_ID,
        branch_id : BRANCH_ID,
        product_id,
        lot_id    : lot.id,
        tipo      : 'ingreso',
        motivo    : motivo || 'ingreso directo',
        cantidad  : Number(cantidad),
        created_at: new Date().toISOString()
      }])
    });
    if (!insMove.ok) return new NextResponse(await insMove.text(), { status: 400 });

    return NextResponse.json({ ok: true, lot_id: lot.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
