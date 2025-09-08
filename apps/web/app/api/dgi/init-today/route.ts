import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Ventas de HOY sin factura
    const today = new Date().toISOString().slice(0,10);
    // 1) Trae ventas de hoy
    const salesRes = await fetch(
      `${base}/rest/v1/sales?select=id,company_id,branch_id&fecha=gte.${today} 00:00:00&fecha=lte.${today} 23:59:59`,
      { headers: { apikey: svc, Authorization: `Bearer ${svc}` }, cache: 'no-store' }
    );
    if (!salesRes.ok) {
      return new NextResponse(await salesRes.text(), { status: 400 });
    }
    const sales = await salesRes.json() as Array<{id:string}>;

    // 2) Trae invoices ya existentes para hoy
    const invRes = await fetch(
      `${base}/rest/v1/invoices?select=sale_id&created_at=gte.${today} 00:00:00&created_at=lte.${today} 23:59:59`,
      { headers: { apikey: svc, Authorization: `Bearer ${svc}` }, cache: 'no-store' }
    );
    const invs = await invRes.json() as Array<{sale_id:string}>;
    const yaTienen = new Set(invs.map(i=>i.sale_id));

    // 3) Crea invoice pendiente para cada venta sin invoice
    const creadas:string[] = [];
    for (const s of sales) {
      if (yaTienen.has(s.id)) continue;
      const mk = await fetch(`${base}/rest/v1/rpc/dgi_create_invoice`, {
        method: 'POST',
        headers: {
          apikey: svc,
          Authorization: `Bearer ${svc}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_sale: s.id }),
      });
      if (mk.ok) {
        const id = await mk.json();
        creadas.push(id);
      } else {
        // no detenemos el proceso; seguimos con las demás
        console.warn('No se pudo crear invoice para', s.id, await mk.text());
      }
    }

    return NextResponse.json({ creadas });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
