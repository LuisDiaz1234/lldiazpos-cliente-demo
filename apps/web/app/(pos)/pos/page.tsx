// apps/web/app/(pos)/pos/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import POSClient from './pos-client';

export default function Page() {
  return <POSClient />;
}
