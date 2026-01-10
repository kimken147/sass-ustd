# Platform Admin

平台管理後台 - 使用 Vite + React + Refine v5 + shadcn/ui 構建

## 功能

- ✅ 登入畫面（使用 username）
- ✅ Refine v5 認證整合
- ✅ Platform API 整合
- ✅ Light 主題設計
- ✅ 響應式設計
- ✅ 現代化 UI 組件

## 技術棧

- **Vite** - 快速的前端構建工具
- **React 18** - UI 框架
- **TypeScript** - 類型安全
- **Tailwind CSS** - 樣式框架
- **shadcn/ui** - UI 組件庫
- **React Router v6** - 路由管理
- **Refine v5** - 後台開發框架
- **React Query v5** - 數據獲取和狀態管理

## 開發

```bash
# 安裝依賴
pnpm install

# 設定環境變數（可選）
# 複製 .env.example 並設定 VITE_PLATFORM_API_URL

# 啟動開發伺服器
pnpm dev

# 構建生產版本
pnpm build

# 預覽生產版本
pnpm preview
```

## 環境變數

建立 `.env` 檔案（可選）：

```env
VITE_PLATFORM_API_URL=http://localhost:3000
```

預設值為 `http://localhost:3000`

## 專案結構

```
platform-admin/
├── src/
│   ├── pages/              # 頁面組件
│   │   ├── LoginPage.tsx
│   │   └── DashboardPage.tsx
│   ├── layouts/            # 布局組件（已棄用，改用 Refine Layout）
│   │   └── DashboardLayout.tsx
│   ├── components/
│   │   ├── ui/             # shadcn/ui 基礎組件
│   │   └── refine-ui/      # Refine 官方 shadcn/ui 整合組件 ⭐
│   │       ├── layout/      # Layout 01（側邊欄、標頭）
│   │       ├── views/      # ListView, CreateView, EditView, ShowView
│   │       ├── buttons/    # CreateButton, EditButton, DeleteButton 等
│   │       └── theme/      # ThemeProvider, ThemeToggle
│   ├── providers/          # Refine Providers
│   │   ├── authProvider.tsx
│   │   └── dataProvider.tsx
│   ├── lib/                # 工具函數
│   │   └── utils.ts
│   ├── App.tsx             # 應用入口（Refine 配置）
│   ├── main.tsx            # React 入口
│   └── index.css           # 全局樣式
├── components.json          # shadcn/ui 配置
├── index.html              # HTML 模板
├── vite.config.ts          # Vite 配置
├── tailwind.config.js      # Tailwind 配置
├── tsconfig.json           # TypeScript 配置
└── REFINE_SHADCN_INTEGRATION.md  # Refine 整合指南 ⭐
```

## ⚠️ 重要：使用 Refine 官方組件

**請優先使用 Refine 官方的 shadcn/ui 整合組件**，而不是手動創建：

- ✅ **Layout 01** - 使用 `@/components/refine-ui/layout/layout` 而不是手動創建的 DashboardLayout
- ✅ **ListView** - 使用 `@/components/refine-ui/views/list-view` 構建列表頁面
- ✅ **CreateButton, EditButton 等** - 使用 `@/components/refine-ui/buttons/*`

詳細說明請參考 [REFINE_SHADCN_INTEGRATION.md](./REFINE_SHADCN_INTEGRATION.md)

## API 整合

### 登入 API

- **端點**: `POST /api/auth/login`
- **請求**: `{ username: string, password: string }`
- **響應**: `{ accessToken, refreshToken, expiresIn, user }`

### 認證流程

1. 用戶輸入 username 和 password
2. 透過 `authProvider.login` 呼叫 Platform API
3. 成功後儲存 token 到 localStorage
4. 自動跳轉到 `/dashboard`
5. Refine 會自動處理 token 驗證和刷新

## 主題

目前使用 Light 主題，顏色配置在 `src/index.css` 中定義。

## 下一步

- [ ] 建立完整的儀表板頁面
- [ ] 實作租戶管理功能
- [ ] 實作系統錢包管理
- [ ] 實作數據看板
