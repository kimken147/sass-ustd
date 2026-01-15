import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTenantPages } from '@/tenants';
import { TenantConfig } from '@/shared/types';

export default async function TenantInvestPage() {
  const headersList = await headers();
  const slug = headersList.get('x-tenant-slug');
  const configStr = headersList.get('x-tenant-config');

  if (!slug || !configStr) {
    notFound();
  }

  const tenantConfig: TenantConfig = JSON.parse(configStr);
  const pages = await getTenantPages(slug);

  if (!pages) {
    notFound();
  }

  const { InvestPage } = pages;

  return <InvestPage tenantConfig={tenantConfig} />;
}
