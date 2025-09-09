export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID  = '22222222-2222-2222-2222-222222222222';

export async function POST(req: NextRequest) {
  try {
    const { lot_id, delta, motivo } = await req.json();
    if (!lot_id || !delta) return NextResponse.json({ error: 'lot_id y delta son requeridos' }, { status: 400 });

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' as const };

    // 1) actualizar cantidad del lote
    const up = await fetch(`${base}/rest/v1/stock_lots?id=eq.${lot_id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ cantidad: { increment: Number(delta) } })
    });
    if (!up.ok) {
      // fallback si tu PostgREST no soporta increment
      const get = await fetch(`${base}/rest/v1/stock_lots?id=eq.${lot_id}&select=cantidad`, { headers });
      const cur = (await get.json())[0]?.cantidad ?? 0;
      const set = await fetch(`${base}/rest/v1/stock_lots?id=eq.${lot_id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ cantidad: Number(cur) + Number(delta) })
      });
      if (!set.ok) return new NextResponse(await set.text(), { status: 400 });
    }

    // 2) registrar movimiento
    const mv = await fetch(`${base}/rest/v1/stock_moves`, {
      method: 'POST', headers,
      body: JSON.stringify([{
        id: crypto.randomUUID(),
        company_id: COMPANY_ID,
        branch_id : BRANCH_ID,
        product_id: null,        // opcional si tu FK lo permite; si no, podrías resolverlo por select previo
        lot_id    : lot_id,
        tipo      : Number(delta) >= 0 ? 'ajuste_entrada' : 'ajuste_salida',
        motivo    : motivo || 'ajuste manual',
        cantidad  : Number(delta),
        created_at: new Date().toISOString()
      }])
    });
    if (!mv.ok) return new NextResponse(await mv.text(), { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
