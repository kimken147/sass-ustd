# SaaS Platform Monorepo 架構

## 📋 專案概述

多租戶虛擬貨幣投資 SaaS 平台，專注於幫助客戶使用虛擬貨幣（TRON、USDT）進行投資，支援：
- ✅ 每個租戶獨立部署
- ✅ 無限層級代理系統
- ✅ DeFi 合約授權投資機制
- ✅ 自動分潤與佣金計算
- ✅ 白標（White-label）支持

## 🏗️ 目錄結構

```
saas-platform/
├── apps/
│   ├── platform-api/              # 平台管理 API (NestJS)
│   ├── tenant-api/                # 租戶業務 API (NestJS) - 部署模板
│   ├── platform-admin/            # 平台管理後台 (Vite + React + Refine + shadcn/ui)
│   ├── tenant-admin/              # 租戶管理後台 (Vite + React + Refine + shadcn/ui)
│   ├── agent-portal/              # 代理商後台 (Vite + React + Refine + shadcn/ui)
│   └── customer-web/              # 客戶前台 (Next.js + shadcn/ui)
│
├── packages/
│   ├── database/                  # 數據庫 Entities (MikroORM)
│   ├── shared-types/              # TypeScript 共享類型
│   ├── shared/                    # NestJS 共享工具和 DTOs
│   ├── ui/                        # shadcn/ui 共享組件庫
│   ├── auth/                      # 認證授權模組
│   ├── utils/                     # 共享工具函數
│   ├── theme/                     # 白標主題系統
│   ├── api-client/                # API 客戶端封裝
│   └── config/                    # 共享配置（ESLint, TS, Tailwind）
│
├── docs/                          # 專案文檔
│   ├── AUTH_ARCHITECTURE.md
│   ├── COMMISSION_MECHANISM_FINAL.md
│   ├── CRYPTO_INVESTMENT_ENTITIES.md
│   ├── DATABASE_ER_DIAGRAM.md
│   ├── MIKROORM_COMPLETE.md
│   └── ...
│
├── .github/                       # GitHub 配置
│   └── workflows/                 # CI/CD workflows
│
├── package.json                   # Root package.json
├── pnpm-workspace.yaml            # pnpm workspace 配置
├── turbo.json                     # Turborepo 配置
├── .env.example                   # 環境變數範例
└── README.md
```

## 🎯 技術棧

### 後端 (NestJS)
- **platform-api**: 平台管理 API
- **tenant-api**: 租戶業務 API（可獨立部署）

### 前端
- **後台管理**: Vite + React + Refine + shadcn/ui
  - platform-admin
  - tenant-admin
  - agent-portal
- **客戶前台**: Next.js + shadcn/ui (需要 SEO)

### 共享層
- **Database**: MikroORM + PostgreSQL
- **Monorepo**: Turborepo + pnpm
- **UI**: shadcn/ui + Tailwind CSS
- **類型**: TypeScript

## 🔑 關鍵設計特點

### 1. 租戶隔離
- 每個租戶有獨立的 `tenant-api` 部署
- 獨立的數據庫（`tenant_${tenantId}`）
- 獨立的域名/子域名

### 2. 無限層級代理
- 樹狀結構設計（使用 `path` 和 `level` 追蹤）
- 支援任意深度的代理層級
- 佣金自動計算與分潤（向上分潤機制）

### 3. 虛擬貨幣投資系統
- DeFi 合約授權機制（TRON/USDT）
- 系統錢包管理（執行合約錢包、分潤錢包）
- 租戶多錢包分潤（按比例分配）
- 代理商錢包分潤

### 4. 白標系統
- 動態主題配置
- 自定義 Logo、顏色、字體
- 可配置的功能模組

### 5. 分潤機制
- 系統費率（平台層級）
- 租戶收入比例
- 代理佣金比例
- 自動分潤記錄（RevenueDistribution、CommissionPayout、SystemFeeDistribution）

## 📦 Apps 說明

### platform-api (NestJS)
平台核心 API，管理所有租戶。

**核心模組**:
- **AuthModule**: 平台管理員認證（JWT）
- **TenantsModule**: 租戶管理（CRUD、創建站台、自動創建資料庫、系統錢包指派）
- **SystemWalletsModule**: 系統錢包管理（執行合約錢包、分潤錢包）
- **SitesModule**: 站台列表與統計（跨租戶查詢）

**核心功能**:
- 租戶 CRUD 操作
- 租戶站台創建與管理
- 系統錢包創建與管理
- 租戶系統錢包指派（支援多錢包和比例分配）
- 租戶數據庫自動創建
- 全局數據統計

### tenant-api (NestJS)
租戶業務 API 模板，每個租戶獨立部署。

**核心模組**:
- **AuthModule**: 租戶管理員/代理商認證（JWT）
- **AgentsModule**: 代理商管理（無限層級、佣金設置、統計）
- **CustomersModule**: 投資客戶管理（錢包地址、投資統計、推薦代理）
- **ContractsModule**: DeFi 合約操作（執行投資、處理授權）
- **TransactionsModule**: 交易記錄查詢（分潤記錄、佣金記錄）
- **RevenueWalletsModule**: 租戶分潤錢包管理（多錢包、比例分配）

**核心功能**:
- 代理商 CRUD 與層級管理
- 客戶投資管理
- DeFi 合約執行（TRON/USDT）
- 自動分潤計算與記錄
- 佣金計算與分發
- 租戶分潤錢包配置

### platform-admin (Vite + React + Refine)
平台超級管理員後台。

**主要頁面**:
- **LoginPage**: 平台管理員登入
- **DashboardPage**: 全局數據看板
- **CreateSitePage**: 創建租戶站台
- **WalletsPage**: 系統錢包管理

**主要功能**:
- 租戶列表與管理
- 租戶站台創建
- 系統錢包管理（執行合約錢包、分潤錢包）
- 全局數據統計
- 租戶系統錢包指派

**技術棧**: Vite + React + Refine + shadcn/ui + TanStack Query

### tenant-admin (Vite + React + Refine)
租戶管理後台。

**主要頁面**:
- **LoginPage**: 租戶管理員登入
- **DashboardPage**: 租戶數據看板
- **AgentsPage**: 代理商列表與管理
- **CreateAgentPage / EditAgentPage**: 創建/編輯代理商
- **CustomersPage**: 投資客戶列表與管理
- **WalletsPage**: 租戶分潤錢包配置
- **CommissionPayoutPage**: 佣金分發記錄
- **RevenueDistributionPage**: 收入分潤記錄

**主要功能**:
- 代理商管理（無限層級）
- 投資客戶管理
- 租戶分潤錢包配置（多錢包、比例分配）
- 佣金與分潤記錄查詢
- 業務數據統計

**技術棧**: Vite + React + Refine + shadcn/ui + TanStack Query

### agent-portal (Vite + React + Refine)
代理商後台。

**主要頁面**:
- **LoginPage**: 代理商登入
- **DashboardPage**: 代理數據看板（客戶數、投資額、佣金等）
- **SubAgentsPage**: 下級代理列表
- **CreateSubAgentPage**: 創建下級代理
- **EditSubAgentPage**: 編輯下級代理
- **WalletPage**: 代理商錢包管理

**主要功能**:
- 代理數據看板（統計數據）
- 下級代理管理（無限層級）
- 推薦客戶列表
- 佣金統計與記錄
- 代理商錢包配置

**技術棧**: Vite + React + Refine + shadcn/ui + TanStack Query

### customer-web (Next.js)
終端用戶前台（需要 SEO）。

**主要功能**:
- 投資產品展示
- 虛擬貨幣投資（TRON/USDT）
- 投資記錄查詢
- 會員中心
- 錢包授權管理

**技術棧**: Next.js + shadcn/ui（開發中）

## 📚 Packages 說明

### database
MikroORM Entities 與配置。

**核心 Entities**:
- **BaseEntity**: 基礎實體（id, createdAt, updatedAt, deletedAt）
- **Tenant**: 租戶實體（白標配置、分潤錢包、加密貨幣配置）
- **User**: 用戶實體（認證資訊、多角色支援）
- **Agent**: 代理商實體（無限層級、佣金設置、統計數據）
- **Customer**: 投資客戶實體（錢包地址、投資統計）
- **SystemWallet**: 系統錢包實體（執行合約錢包、分潤錢包）
- **RevenueDistribution**: 收入分潤記錄
- **CommissionPayout**: 佣金分發記錄
- **SystemFeeDistribution**: 系統費分潤記錄

**結構**:
```typescript
- entities/              // MikroORM entities
- config/                // MikroORM 配置
- migrations/            // 數據庫遷移（由各 app 管理）
- index.ts              // 統一導出
```

### shared-types
跨專案的 TypeScript 類型定義。

```typescript
- commission-payout.types.ts
- customer.types.ts
- revenue-distribution.types.ts
- site.types.ts
- wallet.types.ts
- index.ts
```

### shared
NestJS 共享工具和 DTOs。

```typescript
- common/
  - dto/                 // 通用 DTOs（ApiResponse）
  - interceptors/        // 通用攔截器（TransformInterceptor）
- index.ts
```

### ui
shadcn/ui 共享組件庫。

**重要**：所有 shadcn/ui 提供的組件都必須通過官方 CLI 安裝，不要手動創建。

```typescript
- components/
  - ui/                 // shadcn/ui 原始組件（通過 CLI 安裝）
  - business/           // 業務封裝組件
- hooks/                // 共享 Hooks
- lib/                  // 工具函數
```

**添加新組件**：
```bash
cd packages/ui
pnpm dlx shadcn@latest add <component-name> --yes --overwrite
```

詳細說明請參考 [packages/ui/README.md](./packages/ui/README.md)

### auth
統一的認證授權模組。

```typescript
- jwt.service.ts        // JWT 服務
- password.service.ts   // 密碼加密/驗證
- encryption.service.ts // 數據加密服務
- token-blacklist.service.ts // Token 黑名單
- auth.service.base.ts  // 基礎認證服務
- auth-config.interface.ts // 認證配置接口
- index.ts
```

### theme
白標主題系統。

```typescript
- ThemeProvider/        // 主題上下文
- themes/              // 預設主題
- generator/           // 主題生成器
- validator/           // 主題驗證
```

### api-client
統一的 API 客戶端。

```typescript
- platform/            // Platform API client
- tenant/              // Tenant API client
- interceptors/        // 請求/響應攔截器
- types/               // API 類型定義
```

### config
共享配置包。

```typescript
- eslint-config/       // ESLint 配置
- tsconfig/            // TypeScript 配置
- tailwind-config/     // Tailwind 配置
- prettier-config/     // Prettier 配置
```

## 🚀 部署策略

### Platform API
- 單一部署
- 高可用配置
- 負載均衡

### Tenant API
- 每租戶獨立部署
- 動態擴展
- 隔離故障域

### 前端應用
- CDN 分發
- 靜態資源緩存
- 按需加載

## 🔐 安全設計

### 多層級認證
```
Platform Admin → JWT (Platform Level)
Tenant Admin   → JWT (Tenant Level)
Agent          → JWT (Tenant + Agent Tree)
Customer       → JWT (Tenant + Customer)
```

### 數據隔離
- 租戶級別隔離
- 代理樹權限控制
- Row-level Security (RLS)

## 📊 監控與日誌

- 集中式日誌收集
- 性能監控
- 錯誤追蹤
- 業務指標

## 🎨 白標實現

### 租戶配置（Tenant Entity）
```typescript
{
  branding: {
    logo?: string;
    favicon?: string;
    primaryColor?: string;
    secondaryColor?: string;
    companyName?: string;
    contactEmail?: string;
    supportUrl?: string;
  },
  customUrl?: string; // 自定義域名
}
```

### 動態加載
- CSS Variables（通過 theme 包）
- 動態 Logo 替換
- 自定義域名支持

## 🔄 CI/CD 流程

1. **代碼提交** → GitHub
2. **自動測試** → GitHub Actions
3. **構建** → Docker Images
4. **部署**
   - Platform API → 單一實例
   - Tenant APIs → 按需部署
   - Frontend → CDN

## 📈 擴展考量

### 水平擴展
- API 無狀態設計
- 數據庫讀寫分離
- 緩存層（Redis）
- 租戶獨立數據庫隔離

### 垂直擴展
- 資源按需分配
- 租戶分級（Trial/Basic/Pro/Enterprise）

### 功能擴展
- 支援更多區塊鏈（目前支援 TRON）
- 支援更多代幣（目前支援 USDT）
- 更多投資產品類型
- Webhook 支持

## 📚 相關文檔

詳細設計文檔請參考 `docs/` 目錄：

- [CRYPTO_INVESTMENT_ENTITIES.md](./docs/CRYPTO_INVESTMENT_ENTITIES.md) - 虛擬貨幣投資系統實體設計
- [MIKROORM_COMPLETE.md](./docs/MIKROORM_COMPLETE.md) - MikroORM 配置完成清單
- [COMMISSION_MECHANISM_FINAL.md](./docs/COMMISSION_MECHANISM_FINAL.md) - 佣金機制設計
- [DATABASE_ER_DIAGRAM.md](./docs/DATABASE_ER_DIAGRAM.md) - 數據庫 ER 圖
- [AUTH_ARCHITECTURE.md](./docs/AUTH_ARCHITECTURE.md) - 認證架構設計
- [MULTI_TENANT_DATABASE_DECISION.md](./docs/MULTI_TENANT_DATABASE_DECISION.md) - 多租戶數據庫決策
