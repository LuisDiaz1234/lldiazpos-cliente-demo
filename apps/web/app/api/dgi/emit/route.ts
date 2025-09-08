import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest){
  const folio = `SERIE-${Date.now()}`;
  const qr = `https://dgi.gob.pa/consulta?folio=${folio}`;
  return NextResponse.json({ folio, qr_url: qr, dgi_uuid: crypto.randomUUID() });
}
