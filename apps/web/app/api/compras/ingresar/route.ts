export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

export async function POST(req: NextRequest) {
  try {
    const { items, motivo } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Sin items' }, { status: 400 });
    }

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' as const };

    // 1) Insertar lotes
    const lots = items.map((it: any) => ({
      id         : crypto.randomUUID(),
      company_id : COMPANY_ID,
      branch_id  : BRANCH_ID,
      product_id : it.product_id,
      lote       : it.lote || null,
      vencimiento: it.vence || null,
      cantidad   : Number(it.cantidad || 0),
      unit       : it.unidad || 'unidad'
    }));

    const insLots = await fetch(`${base}/rest/v1/stock_lots`, {
      method: 'POST', headers, body: JSON.stringify(lots)
    });
    if (!insLots.ok) return new NextResponse(await insLots.text(), { status: 400 });

    // 2) Registrar movimientos de stock (ingreso)
    const moves = items.map((it: any, idx: number) => ({
      id        : crypto.randomUUID(),
      company_id: COMPANY_ID,
      branch_id : BRANCH_ID,
      product_id: it.product_id,
      lot_id    : lots[idx].id,
      tipo      : 'ingreso',
      motivo    : motivo || 'compra',
      cantidad  : Number(it.cantidad || 0),
      created_at: new Date().toISOString()
    }));

    const insMoves = await fetch(`${base}/rest/v1/stock_moves`, {
      method: 'POST', headers, body: JSON.stringify(moves)
    });
    if (!insMoves.ok) return new NextResponse(await insMoves.text(), { status: 400 });

    return NextResponse.json({ ok: true, inserted: lots.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
