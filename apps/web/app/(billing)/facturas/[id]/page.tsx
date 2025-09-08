// apps/web/app/(billing)/facturas/[id]/page.tsx
export const dynamic = 'force-dynamic';

import FacturaClient from './FacturaClient';

type Props = { params: { id: string } };

export default function Page({ params }: Props) {
  return <FacturaClient invoiceId={params.id} />;
}
