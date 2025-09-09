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

    // Tomar product_id del lote
    const lotRes = await fetch(`${base}/rest/v1/stock_lots?id=eq.${lot_id}&select=product_id,cantidad`, { headers });
    const lot = (await lotRes.json())[0];
    if (!lot) return NextResponse.json({ error: 'Lote no encontrado' }, { status: 404 });

    // Actualizar cantidad del lote
    const nueva = Number(lot.cantidad || 0) + Number(delta);
    if (nueva < 0) return NextResponse.json({ error: 'Cantidad resultante negativa' }, { status: 400 });

    const up = await fetch(`${base}/rest/v1/stock_lots?id=eq.${lot_id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ cantidad: nueva })
    });
    if (!up.ok) return new NextResponse(await up.text(), { status: 400 });

    // Registrar movimiento
    const mv = await fetch(`${base}/rest/v1/stock_moves`, {
      method: 'POST', headers,
      body: JSON.stringify([{
        id        : crypto.randomUUID(),
        company_id: COMPANY_ID,
        branch_id : BRANCH_ID,
        product_id: lot.product_id,
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
