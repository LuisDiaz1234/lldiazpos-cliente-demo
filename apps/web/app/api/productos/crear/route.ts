export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';

export async function POST(req: NextRequest) {
  try {
    const { nombre, precio, itbms_rate, es_insumo } = await req.json();
    if (!nombre || precio == null) return NextResponse.json({ error: 'nombre y precio son requeridos' }, { status: 400 });

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' as const };

    const body = [{
      id         : crypto.randomUUID(),
      company_id : COMPANY_ID,
      nombre,
      precio     : Number(precio),
      itbms_rate : Number(itbms_rate ?? 0.07),
      es_insumo  : !!es_insumo,
      activo     : true
    }];

    const res = await fetch(`${base}/rest/v1/products`, {
      method: 'POST', headers, body: JSON.stringify(body)
    });
    if (!res.ok) return new NextResponse(await res.text(), { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
