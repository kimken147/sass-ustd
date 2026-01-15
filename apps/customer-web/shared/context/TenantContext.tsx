'use client';

import { createContext } from 'react';
import { TenantConfig } from '@/shared/types';

export const TenantContext = createContext<TenantConfig | null>(null);

interface TenantProviderProps {
  config: TenantConfig;
  children: React.ReactNode;
}

export function TenantProvider({ config, children }: TenantProviderProps) {
  return (
    <TenantContext.Provider value={config}>
      {children}
    </TenantContext.Provider>
  );
}
