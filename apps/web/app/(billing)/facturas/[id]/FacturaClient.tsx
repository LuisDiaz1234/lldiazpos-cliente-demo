// apps/web/app/(billing)/facturas/[id]/FacturaClient.tsx
'use client';

import { useEffect, useState } from 'react';
import FacturaA4 from '@/components/print/FacturaA4';

type Props = { invoiceId: string };

export default function FacturaClient({ invoiceId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [sale, setSale]       = useState<any>(null);
  const [items, setItems]     = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/facturas/${invoiceId}`, { cache: 'no-store' });
        if (!res.ok) {
          const txt = await res.text();
          setError(txt || 'Error cargando factura');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setInvoice(data.invoice);
        setSale(data.sale);
        setItems(data.items || []);
        setCompany(data.company || null);
      } catch (e:any) {
        setError(e?.message || 'Error cargando factura');
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId]);

  if (loading) return <div className="p-6">Cargando…</div>;
  if (error)   return <div className="p-6 text-rose-600">Factura no encontrada</div>;
  if (!invoice) return <div className="p-6">Factura no encontrada.</div>;

  return (
    <div className="max-w-[800px] mx-auto bg-white p-8">
      <FacturaA4 invoice={invoice} sale={sale} items={items} company={company} />
      <div className="mt-4 no-print">
        <button onClick={() => (globalThis as any).print?.()} className="px-4 py-2 border rounded-xl">
          Imprimir
        </button>
      </div>
      <style>{`
        @media print {
          .no-print { display: none; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
