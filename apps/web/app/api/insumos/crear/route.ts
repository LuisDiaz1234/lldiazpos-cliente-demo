export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';

export async function POST(req: NextRequest) {
  try {
    const { nombre, unidad_default } = await req.json();
    if (!nombre) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 });

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' as const };

    const row = {
      id: crypto.randomUUID(),
      company_id: COMPANY_ID,
      nombre,
      precio: 0,
      es_insumo: true,
      activo: true,
      itbms_rate: 0,
      unit: unidad_default || 'unidad'
    };

    const res = await fetch(`${base}/rest/v1/products`, {
      method: 'POST', headers, body: JSON.stringify([row])
    });

    const txt = await res.text();
    if (!res.ok) return new NextResponse(txt, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
