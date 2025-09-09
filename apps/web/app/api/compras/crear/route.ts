import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  const sb = await createClient();
  const body = await req.json();

  const { company_id, branch_id, supplier, items } = body;

  const { data, error } = await sb.rpc('rpc_create_purchase', {
    p_company: company_id,
    p_branch: branch_id,
    p_supplier: supplier,
    p_items: items
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ purchase_id: data });
}
