# 完整目錄結構

```
saas-platform/
│
├── 📄 package.json                    # Root package.json
├── 📄 pnpm-workspace.yaml             # pnpm workspace 配置
├── 📄 turbo.json                      # Turborepo 配置
├── 📄 .env.example                    # 環境變數範例
├── 📄 README.md                       # 專案說明
├── 📄 ARCHITECTURE.md                 # 架構文檔
├── 📄 .gitignore                      # Git 忽略文件
│
├── 📁 apps/                           # 應用程式目錄
│   │
│   ├── 📁 platform-api/               # 平台管理 API (NestJS)
│   │   ├── 📄 package.json
│   │   ├── 📄 tsconfig.json
│   │   ├── 📄 nest-cli.json
│   │   ├── 📁 src/
│   │   │   ├── 📄 main.ts
│   │   │   ├── 📄 app.module.ts
│   │   │   ├── 📁 modules/
│   │   │   │   ├── 📁 tenants/        # 租戶管理模組
│   │   │   │   ├── 📁 billing/        # 計費模組
│   │   │   │   ├── 📁 analytics/      # 數據分析模組
│   │   │   │   └── 📁 deployment/     # 部署管理模組
│   │   │   ├── 📁 common/
│   │   │   │   ├── 📁 guards/
│   │   │   │   ├── 📁 interceptors/
│   │   │   │   └── 📁 decorators/
│   │   │   └── 📁 config/
│   │   └── 📁 test/
│   │
│   ├── 📁 tenant-api/                 # 租戶業務 API (NestJS)
│   │   ├── 📄 package.json
│   │   ├── 📄 tsconfig.json
│   │   ├── 📄 nest-cli.json
│   │   ├── 📁 src/
│   │   │   ├── 📄 main.ts
│   │   │   ├── 📄 app.module.ts
│   │   │   ├── 📁 modules/
│   │   │   │   ├── 📁 agents/         # 代理商模組
│   │   │   │   ├── 📁 customers/      # 客戶管理模組
│   │   │   │   ├── 📁 products/       # 商品管理模組
│   │   │   │   ├── 📁 orders/         # 訂單管理模組
│   │   │   │   └── 📁 commission/     # 佣金計算模組
│   │   │   ├── 📁 common/
│   │   │   └── 📁 config/
│   │   └── 📁 test/
│   │
│   ├── 📁 platform-admin/             # 平台管理後台 (Vite + React + Refine)
│   │   ├── 📄 package.json
│   │   ├── 📄 tsconfig.json
│   │   ├── 📄 vite.config.ts
│   │   ├── 📄 index.html
│   │   ├── 📁 src/
│   │   │   ├── 📄 main.tsx
│   │   │   ├── 📄 App.tsx
│   │   │   ├── 📁 pages/
│   │   │   │   ├── 📁 tenants/        # 租戶管理頁面
│   │   │   │   ├── 📁 billing/        # 計費管理頁面
│   │   │   │   ├── 📁 analytics/      # 數據看板頁面
│   │   │   │   └── 📁 settings/       # 系統設定頁面
│   │   │   ├── 📁 components/
│   │   │   ├── 📁 providers/
│   │   │   ├── 📁 hooks/
│   │   │   └── 📁 styles/
│   │   └── 📁 public/
│   │
│   ├── 📁 tenant-admin/               # 租戶管理後台 (Vite + React + Refine)
│   │   ├── 📄 package.json
│   │   ├── 📄 tsconfig.json
│   │   ├── 📄 vite.config.ts
│   │   ├── 📄 index.html
│   │   ├── 📁 src/
│   │   │   ├── 📄 main.tsx
│   │   │   ├── 📄 App.tsx
│   │   │   ├── 📁 pages/
│   │   │   │   ├── 📁 dashboard/      # 儀表板
│   │   │   │   ├── 📁 agents/         # 代理商管理
│   │   │   │   ├── 📁 customers/      # 客戶管理
│   │   │   │   ├── 📁 products/       # 商品管理
│   │   │   │   ├── 📁 orders/         # 訂單管理
│   │   │   │   └── 📁 settings/       # 設定（含白標）
│   │   │   ├── 📁 components/
│   │   │   ├── 📁 providers/
│   │   │   └── 📁 hooks/
│   │   └── 📁 public/
│   │
│   ├── 📁 agent-portal/               # 代理商後台 (Vite + React + Refine)
│   │   ├── 📄 package.json
│   │   ├── 📄 tsconfig.json
│   │   ├── 📄 vite.config.ts
│   │   ├── 📄 index.html
│   │   ├── 📁 src/
│   │   │   ├── 📄 main.tsx
│   │   │   ├── 📄 App.tsx
│   │   │   ├── 📁 pages/
│   │   │   │   ├── 📁 dashboard/      # 代理數據看板
│   │   │   │   ├── 📁 sub-agents/     # 下級代理管理
│   │   │   │   ├── 📁 customers/      # 客戶列表
│   │   │   │   ├── 📁 orders/         # 訂單查詢
│   │   │   │   ├── 📁 commission/     # 佣金統計
│   │   │   │   └── 📁 promotion/      # 推廣工具
│   │   │   ├── 📁 components/
│   │   │   └── 📁 providers/
│   │   └── 📁 public/
│   │
│   └── 📁 customer-web/               # 客戶前台 (Next.js)
│       ├── 📄 package.json
│       ├── 📄 tsconfig.json
│       ├── 📄 next.config.js
│       ├── 📁 src/
│       │   ├── 📁 app/
│       │   │   ├── 📄 layout.tsx
│       │   │   ├── 📄 page.tsx
│       │   │   ├── 📁 products/       # 商品頁面
│       │   │   ├── 📁 cart/           # 購物車
│       │   │   ├── 📁 checkout/       # 結帳流程
│       │   │   └── 📁 account/        # 會員中心
│       │   ├── 📁 components/
│       │   └── 📁 lib/
│       └── 📁 public/
│
├── 📁 packages/                       # 共享包目錄
│   │
│   ├── 📁 database/                   # 資料庫層
│   │   ├── 📄 package.json
│   │   ├── 📄 tsconfig.json
│   │   ├── 📁 prisma/
│   │   │   ├── 📄 schema.prisma      # Prisma Schema
│   │   │   ├── 📁 migrations/        # 資料庫遷移
│   │   │   └── 📄 seed.ts            # 種子數據
│   │   └── 📁 src/
│   │       ├── 📄 index.ts
│   │       ├── 📁 entities/          # 實體定義
│   │       └── 📁 repositories/      # Repository Pattern
│   │
│   ├── 📁 shared-types/               # 共享類型定義
│   │   ├── 📄 package.json
│   │   ├── 📄 tsconfig.json
│   │   └── 📁 src/
│   │       ├── 📄 index.ts
│   │       ├── 📄 tenant.types.ts    # 租戶相關類型
│   │       ├── 📄 agent.types.ts     # 代理商相關類型
│   │       ├── 📄 user.types.ts      # 用戶相關類型
│   │       ├── 📄 billing.types.ts   # 計費相關類型
│   │       └── 📄 theme.types.ts     # 主題相關類型
│   │
│   ├── 📁 ui/                         # UI 組件庫 (shadcn/ui)
│   │   ├── 📄 package.json
│   │   ├── 📄 tsconfig.json
│   │   ├── 📄 tailwind.config.js
│   │   └── 📁 src/
│   │       ├── 📄 index.ts
│   │       ├── 📁 components/
│   │       │   ├── 📁 ui/            # shadcn/ui 原始組件
│   │       │   │   ├── 📄 button.tsx
│   │       │   │   ├── 📄 card.tsx
│   │       │   │   ├── 📄 dialog.tsx
│   │       │   │   ├── 📄 form.tsx
│   │       │   │   ├── 📄 table.tsx
│   │       │   │   └── ...
│   │       │   └── 📁 business/      # 業務組件
│   │       │       ├── 📄 DataTable.tsx
│   │       │       ├── 📄 UserAvatar.tsx
│   │       │       └── ...
│   │       ├── 📁 hooks/
│   │       └── 📁 lib/
│   │           └── 📄 utils.ts
│   │
│   ├── 📁 auth/                       # 認證授權模組
│   │   ├── 📄 package.json
│   │   ├── 📄 tsconfig.json
│   │   └── 📁 src/
│   │       ├── 📄 index.ts
│   │       ├── 📁 strategies/        # 認證策略
│   │       │   ├── 📄 jwt.strategy.ts
│   │       │   └── 📄 oauth.strategy.ts
│   │       ├── 📁 guards/            # 守衛
│   │       │   ├── 📄 auth.guard.ts
│   │       │   └── 📄 roles.guard.ts
│   │       ├── 📁 decorators/        # 裝飾器
│   │       └── 📁 middleware/        # 中間件
│   │
│   ├── 📁 utils/                      # 工具函數
│   │   ├── 📄 package.json
│   │   ├── 📄 tsconfig.json
│   │   └── 📁 src/
│   │       ├── 📄 index.ts
│   │       ├── 📄 date.utils.ts      # 日期工具
│   │       ├── 📄 string.utils.ts    # 字串工具
│   │       ├── 📄 number.utils.ts    # 數字工具
│   │       └── 📄 validation.utils.ts # 驗證工具
│   │
│   ├── 📁 theme/                      # 白標主題系統
│   │   ├── 📄 package.json
│   │   ├── 📄 tsconfig.json
│   │   └── 📁 src/
│   │       ├── 📄 index.ts
│   │       ├── 📁 context/
│   │       │   └── 📄 ThemeProvider.tsx
│   │       ├── 📁 themes/            # 預設主題
│   │       │   ├── 📄 default.theme.ts
│   │       │   └── 📄 dark.theme.ts
│   │       ├── 📁 generator/         # 主題生成器
│   │       └── 📁 validator/         # 主題驗證器
│   │
│   ├── 📁 api-client/                 # API 客戶端
│   │   ├── 📄 package.json
│   │   ├── 📄 tsconfig.json
│   │   └── 📁 src/
│   │       ├── 📄 index.ts
│   │       ├── 📁 platform/          # Platform API Client
│   │       │   ├── 📄 tenants.client.ts
│   │       │   ├── 📄 billing.client.ts
│   │       │   └── 📄 analytics.client.ts
│   │       ├── 📁 tenant/            # Tenant API Client
│   │       │   ├── 📄 agents.client.ts
│   │       │   ├── 📄 customers.client.ts
│   │       │   └── 📄 orders.client.ts
│   │       ├── 📁 interceptors/      # 攔截器
│   │       └── 📁 types/             # API 類型定義
│   │
│   └── 📁 config/                     # 共享配置
│       ├── 📄 package.json
│       ├── 📁 eslint-config/
│       │   └── 📄 index.js
│       ├── 📁 tsconfig/
│       │   ├── 📄 base.json
│       │   ├── 📄 nextjs.json
│       │   └── 📄 react.json
│       ├── 📁 tailwind-config/
│       │   └── 📄 index.js
│       └── 📁 prettier-config/
│           └── 📄 index.js
│
├── 📁 infrastructure/                 # 基礎設施
│   ├── 📁 docker/
│   │   ├── 📄 Dockerfile.platform-api
│   │   ├── 📄 Dockerfile.tenant-api
│   │   ├── 📄 Dockerfile.frontend
│   │   └── 📄 docker-compose.yml
│   ├── 📁 kubernetes/
│   │   ├── 📁 platform/
│   │   ├── 📁 tenant/
│   │   └── 📁 ingress/
│   └── 📁 terraform/
│       ├── 📁 aws/
│       ├── 📁 gcp/
│       └── 📁 azure/
│
├── 📁 scripts/                        # 自動化腳本
│   ├── 📄 deploy-tenant.js           # 部署新租戶
│   ├── 📄 create-tenant.js           # 創建租戶配置
│   ├── 📄 generate-theme.js          # 生成白標主題
│   └── 📄 backup-database.js         # 資料庫備份
│
├── 📁 .github/                        # GitHub 配置
│   └── 📁 workflows/
│       ├── 📄 ci.yml                 # CI 流程
│       ├── 📄 cd.yml                 # CD 流程
│       └── 📄 test.yml               # 測試流程
│
└── 📁 docs/                           # 文檔目錄
    ├── 📄 DEVELOPMENT.md             # 開發指南
    ├── 📄 API.md                     # API 文檔
    ├── 📄 DEPLOYMENT.md              # 部署指南
    ├── 📄 WHITE_LABEL.md             # 白標配置指南
    ├── 📄 CODE_STYLE.md              # 代碼規範
    └── 📄 COMMIT_CONVENTION.md       # 提交規範
```

## 📊 統計資訊

### Apps (6個應用)
- 2 個 NestJS API (platform-api, tenant-api)
- 3 個 Vite + React 後台 (platform-admin, tenant-admin, agent-portal)
- 1 個 Next.js 前台 (customer-web)

### Packages (8個共享包)
- database: Prisma ORM 封裝
- shared-types: TypeScript 類型定義
- ui: shadcn/ui 組件庫
- auth: 認證授權模組
- utils: 工具函數庫
- theme: 白標主題系統
- api-client: API 客戶端封裝
- config: 共享配置

### 總計
- **6 個獨立應用**
- **8 個共享包**
- **支援無限擴展**
