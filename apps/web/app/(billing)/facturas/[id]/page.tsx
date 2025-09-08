import { createClient } from '@/lib/supabaseClient';
import FacturaA4 from '@/components/print/FacturaA4';

type Props = { params: { id: string } };

export const dynamic = 'force-dynamic';

export default async function FacturaPage({ params }: Props) {
  const supabase = createClient(); // Nota: en server, podrías usar fetch a REST; mantener simple:

  // Como createClient() en server no tiene las cookies, preferimos REST directo:
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // invoice + sale
  const invRes = await fetch(`${base}/rest/v1/invoices?id=eq.${params.id}&select=*,sales(*)`, {
    headers: { apikey: svc, Authorization: `Bearer ${svc}` },
    cache: 'no-store'
  });
  const invArr = await invRes.json();
  const invoice = invArr?.[0];

  if (!invoice) {
    return <div className="p-6">Factura no encontrada.</div>;
  }

  // sale items
  const itemsRes = await fetch(`${base}/rest/v1/sale_items?sale_id=eq.${invoice.sale_id}`, {
    headers: { apikey: svc, Authorization: `Bearer ${svc}` },
    cache: 'no-store'
  });
  const items = await itemsRes.json();

  // company
  const compRes = await fetch(`${base}/rest/v1/companies?id=eq.${invoice.company_id}&select=*`, {
    headers: { apikey: svc, Authorization: `Bearer ${svc}` },
    cache: 'no-store'
  });
  const companyArr = await compRes.json();
  const company = companyArr?.[0];

  // Render A4
  return (
    <div className="max-w-[800px] mx-auto bg-white p-8">
      <FacturaA4 invoice={invoice} sale={invoice.sales} items={items} company={company} />
      <div className="mt-4 no-print">
        <button onClick={() => (globalThis as any).print?.()} className="px-4 py-2 border rounded-xl">Imprimir</button>
      </div>
      <style jsx global>{`
        @media print { .no-print { display:none } body { background:white } }
      `}</style>
    </div>
  );
}
