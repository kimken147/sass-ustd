'use client';

import { useContext } from 'react';
import { TenantContext, TenantContextValue } from '@/shared/context/TenantContext';

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }

  return context;
}
