import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { TenantProvider } from '@/shared/context/TenantContext';
import { TenantConfig } from '@/shared/types';

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const configStr = headersList.get('x-tenant-config');

  if (!configStr) {
    notFound();
  }

  const tenantConfig: TenantConfig = JSON.parse(configStr);

  return (
    <TenantProvider config={tenantConfig}>
      {children}
    </TenantProvider>
  );
}
