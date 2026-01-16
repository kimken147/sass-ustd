import { ComponentType } from 'react';
import { TenantPageProps } from '@/shared/types';

interface TenantPages {
  InvestPage: ComponentType<TenantPageProps>;
  SuccessPage: ComponentType<TenantPageProps>;
}

const tenantRegistry: Record<string, () => Promise<TenantPages>> = {
  'tenant-a': () => import('./tenant-a').then(m => ({
    InvestPage: m.InvestPage,
    SuccessPage: m.SuccessPage,
  })),
  'test002': () => import('./test002').then(m => ({
    InvestPage: m.InvestPage,
    SuccessPage: m.SuccessPage,
  })),
};

export async function getTenantPages(slug: string): Promise<TenantPages | null> {
  const loader = tenantRegistry[slug];
  if (!loader) return null;
  return loader();
}

export function isTenantRegistered(slug: string): boolean {
  return slug in tenantRegistry;
}
