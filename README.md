# SaaS Platform Monorepo

> 多租戶 SaaS 平台，支援獨立部署、無限層級代理、多種計費模式與白標功能

## 📋 專案概述

本專案是一個企業級多租戶 SaaS 平台，特點包括：

- ✅ **獨立租戶部署**：每個租戶擁有獨立的 API 實例，避免相互影響
- ✅ **無限層級代理**：支援任意深度的代理商層級結構
- ✅ **多種計費模式**：按租戶數/用戶數/功能模組靈活計費
- ✅ **白標支持**：完整的品牌定制能力（Logo、顏色、域名）
- ✅ **Monorepo 架構**：使用 Turborepo + pnpm 管理多專案

## 🏗️ 技術棧

### 後端
- **NestJS** - 企業級 Node.js 框架
- **Prisma** - 現代化 ORM
- **PostgreSQL** - 主要資料庫
- **Redis** - 快取層

### 前端
- **Vite + React** - 後台管理介面（平台、租戶、代理商）
- **Next.js** - 客戶前台（需 SEO）
- **Refine** - 後台開發框架
- **shadcn/ui** - UI 組件庫
- **Tailwind CSS** - 樣式框架

### 基礎設施
- **Turborepo** - Monorepo 構建系統
- **pnpm** - 包管理器
- **Docker** - 容器化
- **Kubernetes** - 容器編排

## 📁 專案結構

```
saas-platform/
├── apps/                          # 應用程式
│   ├── platform-api/              # 平台管理 API
│   ├── tenant-api/                # 租戶 API 模板
│   ├── platform-admin/            # 平台管理後台
│   ├── tenant-admin/              # 租戶管理後台
│   ├── agent-portal/              # 代理商後台
│   └── customer-web/              # 客戶前台
│
├── packages/                      # 共享包
│   ├── database/                  # 資料庫層
│   ├── shared-types/              # 類型定義
│   ├── ui/                        # UI 組件
│   ├── auth/                      # 認證授權
│   ├── utils/                     # 工具函數
│   ├── theme/                     # 白標主題
│   ├── api-client/                # API 客戶端
│   └── config/                    # 共享配置
│
├── infrastructure/                # 基礎設施
└── scripts/                       # 腳本工具
```

詳細架構說明請參考 [ARCHITECTURE.md](./ARCHITECTURE.md)

## 🚀 快速開始

### 環境要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- PostgreSQL >= 14
- Redis >= 6

### 安裝依賴

```bash
# 安裝 pnpm（如果還沒安裝）
npm install -g pnpm

# 安裝所有依賴
pnpm install
```

### 環境配置

```bash
# 複製環境變數範例
cp .env.example .env

# 編輯 .env 設置你的配置
vim .env
```

### 啟動開發環境

```bash
# 啟動所有服務
pnpm dev

# 或者單獨啟動某個服務
pnpm --filter @saas-platform/platform-api dev
pnpm --filter @saas-platform/platform-admin dev
```

## 📦 Apps 說明

### Platform API (平台管理 API)
```bash
cd apps/platform-api
pnpm dev
# 訪問: http://localhost:3000
# Swagger: http://localhost:3000/api
```

**職責**：
- 管理所有租戶
- 租戶部署與配置
- 全局數據分析
- 計費管理

### Tenant API (租戶 API)
```bash
cd apps/tenant-api
pnpm dev
# 訪問: http://localhost:3001
```

**職責**：
- 租戶業務邏輯
- 代理商管理
- 客戶管理
- 訂單處理

### Platform Admin (平台管理後台)
```bash
cd apps/platform-admin
pnpm dev
# 訪問: http://localhost:5173
```

**功能**：
- 租戶管理
- 計費控制
- 系統監控
- 全局設定

### Tenant Admin (租戶管理後台)
```bash
cd apps/tenant-admin
pnpm dev
# 訪問: http://localhost:5174
```

**功能**：
- 業務管理
- 代理商管理
- 白標配置
- 數據報表

### Agent Portal (代理商後台)
```bash
cd apps/agent-portal
pnpm dev
# 訪問: http://localhost:5175
```

**功能**：
- 代理數據看板
- 下級代理管理
- 推廣連結
- 佣金統計

### Customer Web (客戶前台)
```bash
cd apps/customer-web
pnpm dev
# 訪問: http://localhost:3002
```

**功能**：
- 商品展示
- 購物車
- 訂單管理
- 會員中心

## 🔧 常用命令

### 開發
```bash
pnpm dev              # 啟動所有服務
pnpm dev:api          # 只啟動 API 服務
pnpm dev:web          # 只啟動前端服務
```

### 構建
```bash
pnpm build            # 構建所有專案
pnpm build:api        # 只構建 API
pnpm build:web        # 只構建前端
```

### 測試
```bash
pnpm test             # 運行所有測試
pnpm test:watch       # 監聽模式
pnpm test:cov         # 測試覆蓋率
```

### 程式碼品質
```bash
pnpm lint             # 檢查所有程式碼
pnpm format           # 格式化程式碼
pnpm type-check       # 類型檢查
```

### 資料庫
```bash
pnpm db:generate      # 生成 Prisma Client
pnpm db:migrate       # 運行遷移
pnpm db:studio        # 打開 Prisma Studio
pnpm db:seed          # 填充種子數據
```

### 部署
```bash
pnpm deploy:tenant    # 部署新租戶
pnpm create:tenant    # 創建租戶配置
```

## 📚 文檔

- [架構設計](./ARCHITECTURE.md) - 詳細架構說明
- [開發指南](./docs/DEVELOPMENT.md) - 開發流程與規範
- [API 文檔](./docs/API.md) - API 接口說明
- [部署指南](./docs/DEPLOYMENT.md) - 部署流程
- [白標配置](./docs/WHITE_LABEL.md) - 白標系統使用

## 🔐 安全考量

- JWT 多層級認證
- 租戶數據隔離
- API 速率限制
- SQL 注入防護
- XSS 防護
- CSRF 保護

## 🤝 參與貢獻

歡迎提交 Issue 和 Pull Request！

開發前請閱讀：
1. [貢獻指南](./CONTRIBUTING.md)
2. [代碼規範](./docs/CODE_STYLE.md)
3. [提交規範](./docs/COMMIT_CONVENTION.md)

## 📄 授權

MIT License

## 👥 團隊

- 架構設計：[Your Name]
- 後端開發：[Team Member]
- 前端開發：[Team Member]
- DevOps：[Team Member]

## 📮 聯繫方式

- Email: your-email@example.com
- Discord: [邀請連結]
- 問題回報：[GitHub Issues](https://github.com/your-org/saas-platform/issues)
