import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest){
  const { rows } = await req.json();
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows || []);
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
  const buf = XLSX.write(wb, { bookType:'xlsx', type:'buffer' });
  return new NextResponse(buf, {
    status:200,
    headers:{
      'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':'attachment; filename="ventas.xlsx"'
    }
  });
}
