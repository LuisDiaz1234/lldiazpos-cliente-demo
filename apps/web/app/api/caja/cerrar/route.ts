import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest){
  const { p_session } = await req.json();
  if(!p_session) return NextResponse.json({ error:'Falta p_session' }, { status:400 });

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // 1) Obtener resumen para el saldo final
  const sumRes = await fetch(`${base}/rest/v1/rpc/rpc_cash_session_summary`, {
    method:'POST',
    headers:{ apikey: svc, Authorization:`Bearer ${svc}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ p_session })
  });
  if(!sumRes.ok) return new NextResponse(await sumRes.text(), { status:400 });
  const summary = await sumRes.json();
  const esperado = Number(summary?.totales?.esperado_en_caja || 0);

  // 2) Cerrar sesión
  const closeRes = await fetch(`${base}/rest/v1/cash_sessions?id=eq.${p_session}`, {
    method:'PATCH',
    headers:{ apikey: svc, Authorization:`Bearer ${svc}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ estado:'cerrada', cierre: new Date().toISOString(), saldo_final: esperado })
  });
  const txt = await closeRes.text();
  if(!closeRes.ok) return new NextResponse(txt, { status:400 });

  return NextResponse.json({ ok:true, saldo_final: esperado });
}
