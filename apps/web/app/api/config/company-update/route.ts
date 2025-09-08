import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest){
  try{
    const body = await req.json();
    const { id } = body || {};
    if(!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

    const allowed = [
      'auto_emit_dgi',
      'descuento_jubilado',
      'logo_url',
      'ruc',
      'direccion',
      'telefono',
      'email',
      'nombre', // por si quieres editar el nombre también
    ] as const;

    const patch: Record<string, any> = {};
    for (const k of allowed) if (k in body) patch[k] = body[k];

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const res = await fetch(`${base}/rest/v1/companies?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: svc,
        Authorization: `Bearer ${svc}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
      cache: 'no-store',
    });

    const text = await res.text();
    if(!res.ok) return new NextResponse(text, { status: 400 });

    return NextResponse.json({ ok: true });
  }catch(e:any){
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
