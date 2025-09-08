// apps/web/app/api/facturas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const id   = params.id;

    // invoice + sale
    const invRes = await fetch(
      `${base}/rest/v1/invoices?id=eq.${id}&select=*,sales(*)`,
      { headers: { apikey: svc, Authorization: `Bearer ${svc}` }, cache: 'no-store' }
    );
    if (!invRes.ok) return new NextResponse(await invRes.text(), { status: 400 });
    const invArr = await invRes.json();
    const invoice = invArr?.[0];
    if (!invoice) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // sale items
    const itemsRes = await fetch(
      `${base}/rest/v1/sale_items?sale_id=eq.${invoice.sale_id}`,
      { headers: { apikey: svc, Authorization: `Bearer ${svc}` }, cache: 'no-store' }
    );
    if (!itemsRes.ok) return new NextResponse(await itemsRes.text(), { status: 400 });
    const items = await itemsRes.json();

    // company
    const compRes = await fetch(
      `${base}/rest/v1/companies?id=eq.${invoice.company_id}&select=*`,
      { headers: { apikey: svc, Authorization: `Bearer ${svc}` }, cache: 'no-store' }
    );
    if (!compRes.ok) return new NextResponse(await compRes.text(), { status: 400 });
    const companyArr = await compRes.json();
    const company = companyArr?.[0] || null;

    return NextResponse.json({
      invoice,
      sale: invoice.sales,
      items,
      company,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
