'use client';

import { createContext } from 'react';
import { TenantConfig } from '@/shared/types';

export interface TenantContextValue {
  slug: string;
  config: TenantConfig;
}

export const TenantContext = createContext<TenantContextValue | null>(null);

interface TenantProviderProps {
  slug: string;
  config: TenantConfig;
  children: React.ReactNode;
}

export function TenantProvider({ slug, config, children }: TenantProviderProps) {
  return (
    <TenantContext.Provider value={{ slug, config }}>
      {children}
    </TenantContext.Provider>
  );
}
