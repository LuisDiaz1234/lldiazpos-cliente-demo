// apps/web/app/(billing)/facturas/[id]/FacturaClient.tsx
'use client';

import { useEffect, useState } from 'react';
import FacturaA4 from '@/components/print/FacturaA4';

type Props = { invoiceId: string };

export default function FacturaClient({ invoiceId }: Props) {
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [sale, setSale] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const svc = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        // invoice + sale
        const invRes = await fetch(
          `${base}/rest/v1/invoices?id=eq.${invoiceId}&select=*,sales(*)`,
          { headers: { apikey: svc, Authorization: `Bearer ${svc}` }, cache: 'no-store' }
        );
        const invArr = await invRes.json();
        const inv = invArr?.[0];
        if (!inv) {
          setError('Factura no encontrada');
          setLoading(false);
          return;
        }
        setInvoice(inv);
        setSale(inv.sales);

        // sale items
        const itemsRes = await fetch(
          `${base}/rest/v1/sale_items?sale_id=eq.${inv.sale_id}`,
          { headers: { apikey: svc, Authorization: `Bearer ${svc}` }, cache: 'no-store' }
        );
        setItems(await itemsRes.json());

        // company
        const compRes = await fetch(
          `${base}/rest/v1/companies?id=eq.${inv.company_id}&select=*`,
          { headers: { apikey: svc, Authorization: `Bearer ${svc}` }, cache: 'no-store' }
        );
        const compArr = await compRes.json();
        setCompany(compArr?.[0] || null);
      } catch (e: any) {
        setError(e?.message || 'Error cargando factura');
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId]);

  if (loading) return <div className="p-6">Cargando…</div>;
  if (error) return <div className="p-6 text-rose-600">{error}</div>;
  if (!invoice) return <div className="p-6">Factura no encontrada.</div>;

  return (
    <div className="max-w-[800px] mx-auto bg-white p-8">
      <FacturaA4 invoice={invoice} sale={sale} items={items} company={company} />

      <div className="mt-4 no-print">
        <button onClick={() => (globalThis as any).print?.()} className="px-4 py-2 border rounded-xl">
          Imprimir
        </button>
      </div>

      {/* Usamos <style> normal (NO styled-jsx) para evitar el error en Server Components */}
      <style>{`
        @media print {
          .no-print { display: none; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
