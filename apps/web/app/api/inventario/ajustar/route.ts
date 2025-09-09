export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

export async function POST(req: NextRequest) {
  try {
    const { lot_id, delta, motivo } = await req.json();
    if (!lot_id || !delta) return NextResponse.json({ error: 'lot_id y delta requeridos' }, { status: 400 });

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' as const };

    // Actualiza cantidad del lote
    const up = await fetch(`${base}/rest/v1/stock_lots?id=eq.${lot_id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ cantidad: { increment: Number(delta) } })
    });
    const tUp = await up.text();
    if (!up.ok) return new NextResponse(tUp, { status: 400 });

    // Registra movimiento de inventario
    const mv = {
      id: crypto.randomUUID(),
      company_id: COMPANY_ID,
      branch_id: BRANCH_ID,
      session_id: null,
      tipo: 'ajuste',
      metodo: 'inventario',
      monto: 0,
      referencia: 'ajuste',
      lot_id,
      producto_id: null,
      delta: Number(delta),
      motivo: motivo || 'ajuste'
    };
    const r2 = await fetch(`${base}/rest/v1/cash_moves`, {
      method: 'POST', headers, body: JSON.stringify([mv])
    });
    const t2 = await r2.text();
    if (!r2.ok) return new NextResponse(t2, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
