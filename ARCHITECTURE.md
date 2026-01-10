# SaaS Platform Monorepo 架構

## 📋 專案概述

多租戶 SaaS 平台，支援：
- ✅ 每個租戶獨立部署
- ✅ 無限層級代理系統
- ✅ 多種計費模式（按租戶/用戶/功能）
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
│   ├── database/                  # 數據庫 Schema & Entities
│   ├── shared-types/              # TypeScript 共享類型
│   ├── ui/                        # shadcn/ui 共享組件庫
│   ├── auth/                      # 認證授權模組
│   ├── utils/                     # 共享工具函數
│   ├── theme/                     # 白標主題系統
│   ├── api-client/                # API 客戶端封裝
│   └── config/                    # 共享配置（ESLint, TS, Tailwind）
│
├── infrastructure/                # 基礎設施即代碼
│   ├── docker/                    # Docker 配置
│   ├── kubernetes/                # K8s 部署配置
│   └── terraform/                 # 雲端資源配置
│
├── scripts/                       # 自動化腳本
│   ├── deploy-tenant.js           # 部署新租戶
│   ├── create-tenant.js           # 創建租戶配置
│   └── generate-theme.js          # 生成白標主題
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
- **Database**: Prisma / TypeORM
- **Monorepo**: Turborepo + pnpm
- **UI**: shadcn/ui + Tailwind CSS
- **類型**: TypeScript

## 🔑 關鍵設計特點

### 1. 租戶隔離
- 每個租戶有獨立的 `tenant-api` 部署
- 獨立的數據庫或 Schema
- 獨立的域名/子域名

### 2. 無限層級代理
- 樹狀結構設計
- 支援任意深度的代理層級
- 佣金自動計算與分潤

### 3. 白標系統
- 動態主題配置
- 自定義 Logo、顏色、字體
- 可配置的功能模組

### 4. 多種計費模式
- 按租戶數量計費
- 按用戶數量計費
- 按功能模組計費
- 混合計費模式

## 📦 Apps 說明

### platform-api (NestJS)
平台核心 API，管理所有租戶。

**核心功能域**:
- 租戶管理（CRUD、創建站台、自動創建資料庫）
- 系統商錢包管理（執行合約錢包、分潤錢包）
- 租戶系統錢包指派（支援多錢包和比例分配）
- 租戶部署與配置
- 全局數據分析
- 計費與訂閱管理
- 系統監控

### tenant-api (NestJS)
租戶業務 API 模板，每個租戶獨立部署。

**核心功能域**:
- 業務邏輯（由租戶定義）
- 代理商管理
- 客戶管理
- 訂單處理
- 白標配置

### platform-admin (Vite + React + Refine)
平台超級管理員後台。

**主要功能**:
- 租戶列表與管理
- 租戶部署控制
- 計費管理
- 全局數據看板
- 系統配置

**重要**：使用 Refine 官方的 shadcn/ui 整合組件（Layout 01、ListView、CreateButton 等），詳見 [REFINE_SHADCN_INTEGRATION.md](./apps/platform-admin/REFINE_SHADCN_INTEGRATION.md)

### tenant-admin (Vite + React + Refine)
租戶管理後台。

**主要功能**:
- 業務數據管理
- 代理商管理
- 客戶管理
- 訂單管理
- 白標配置

### agent-portal (Vite + React + Refine)
代理商後台。

**主要功能**:
- 代理數據看板
- 下級代理管理
- 客戶列表
- 推廣連結
- 佣金統計

### customer-web (Next.js)
終端用戶前台（需要 SEO）。

**主要功能**:
- 商品展示
- 購物車
- 訂單管理
- 會員中心

## 📚 Packages 說明

### database
數據庫 Schema 與 Entities。

```typescript
- schema.prisma          // Prisma schema
- entities/              // TypeORM entities
- migrations/            // 數據庫遷移
- repositories/          // Repository pattern
- seeders/              // 種子數據
```

### shared-types
跨專案的 TypeScript 類型定義。

```typescript
- tenant.types.ts
- agent.types.ts
- user.types.ts
- billing.types.ts
- theme.types.ts
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
- strategies/           // JWT, OAuth 策略
- guards/              // NestJS Guards
- decorators/          // 自定義裝飾器
- middleware/          // 認證中間件
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

### 配置文件
```json
{
  "tenantId": "xxx",
  "branding": {
    "logo": "https://...",
    "primaryColor": "#1890ff",
    "secondaryColor": "#52c41a",
    "fontFamily": "Inter"
  },
  "features": {
    "agents": true,
    "multilevel": true,
    "commission": true
  }
}
```

### 動態加載
- CSS Variables
- 動態 Logo 替換
- 功能模組開關

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

### 垂直擴展
- 資源按需分配
- 租戶分級（Basic/Pro/Enterprise）

### 功能擴展
- 插件系統
- 第三方集成
- Webhook 支持
