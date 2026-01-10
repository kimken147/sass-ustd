# Refine + shadcn/ui 整合指南

## 📋 重要說明

根據 [Refine 官方文檔](https://refine.dev/core/docs/ui-integrations/shadcn/introduction/)，Refine 提供了與 shadcn/ui 的官方整合，包含許多預構建的組件。**我們應該優先使用這些官方組件，而不是手動創建**。

## 🎯 為什麼使用 Refine 官方組件？

1. **深度整合**：與 Refine 的數據 hooks、認證、路由和表單處理無縫整合
2. **減少樣板代碼**：預構建的組件減少重複代碼
3. **一致性**：遵循 Refine 和 shadcn/ui 的最佳實踐
4. **可維護性**：官方維護，自動獲得更新和修復

## 📦 已安裝的 Refine 組件

### Layout 組件
- ✅ **Layout 01** - 完整的應用佈局（側邊欄、標頭、主題切換）
  - 位置：`src/components/refine-ui/layout/`
  - 包含：`Layout`, `Header`, `Sidebar`, `Breadcrumb`

### View 組件
- ✅ **ListView** - 列表頁面佈局
- ✅ **CreateView** - 創建頁面佈局
- ✅ **EditView** - 編輯頁面佈局
- ✅ **ShowView** - 詳情頁面佈局
  - 位置：`src/components/refine-ui/views/`

### Button 組件
- ✅ **CreateButton** - 導航到創建頁面
- ✅ **EditButton** - 導航到編輯頁面
- ✅ **DeleteButton** - 刪除按鈕（帶確認對話框）
- ✅ **ShowButton** - 導航到詳情頁面
- ✅ **ListButton** - 導航到列表頁面
- ✅ **CloneButton** - 克隆/複製記錄
- ✅ **RefreshButton** - 刷新數據
  - 位置：`src/components/refine-ui/buttons/`

### Theme 組件
- ✅ **ThemeProvider** - 主題提供者
- ✅ **ThemeToggle** - 主題切換按鈕
- ✅ **ThemeSelect** - 主題選擇器
  - 位置：`src/components/refine-ui/theme/`

## 🚀 使用方式

### 1. 使用 Layout 01

```tsx
import { Layout } from "@/components/refine-ui/layout/layout";
import { ThemeProvider } from "@/components/refine-ui/theme/theme-provider";

function App() {
  return (
    <ThemeProvider>
      <Layout>
        {/* 你的頁面內容 */}
      </Layout>
    </ThemeProvider>
  );
}
```

### 2. 使用 ListView

```tsx
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { CreateButton } from "@/components/refine-ui/buttons/create";
import { useList } from "@refinedev/core";

function SiteList() {
  const { data, isLoading } = useList({
    resource: "sites",
  });

  return (
    <ListView>
      <ListViewHeader
        title="站點列表"
        actionButtons={<CreateButton />}
      />
      {/* 你的列表內容 */}
    </ListView>
  );
}
```

### 3. 使用按鈕組件

```tsx
import { EditButton, DeleteButton, ShowButton } from "@/components/refine-ui/buttons";

function SiteItem({ id }: { id: number }) {
  return (
    <div>
      <ShowButton recordItemId={id} />
      <EditButton recordItemId={id} />
      <DeleteButton recordItemId={id} />
    </div>
  );
}
```

## 📚 更多組件

如果需要更多組件，可以從 Refine 的 registry 安裝：

```bash
# 安裝 DataTable 組件
pnpm dlx shadcn@latest add https://ui.refine.dev/r/data-table.json --yes

# 安裝表單組件
pnpm dlx shadcn@latest add https://ui.refine.dev/r/forms.json --yes

# 安裝認證表單
pnpm dlx shadcn@latest add https://ui.refine.dev/r/auth-forms.json --yes
```

## 🔄 遷移現有代碼

### 從手動創建的 Layout 遷移

**之前**：
```tsx
// 手動創建的 DashboardLayout
export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      <aside>...</aside>
      <main>...</main>
    </div>
  );
}
```

**之後**：
```tsx
// 使用 Refine 的 Layout 01
import { Layout } from "@/components/refine-ui/layout/layout";

export default function DashboardLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
```

### 從手動創建的列表頁面遷移

**之前**：
```tsx
// 手動創建的列表頁面
export default function DashboardPage() {
  const [data, setData] = useState(null);
  // 手動獲取數據...
  return <div>...</div>;
}
```

**之後**：
```tsx
// 使用 Refine 的 ListView 和 hooks
import { ListView, ListViewHeader } from "@/components/refine-ui/views/list-view";
import { useList } from "@refinedev/core";

export default function DashboardPage() {
  const { data, isLoading } = useList({ resource: "sites" });
  
  return (
    <ListView>
      <ListViewHeader title="站點列表" />
      {/* 列表內容 */}
    </ListView>
  );
}
```

## 📖 參考文檔

- [Refine + shadcn/ui 官方文檔](https://refine.dev/core/docs/ui-integrations/shadcn/introduction/)
- [Refine Component Registry](https://ui.refine.dev)
- [shadcn/ui 文檔](https://ui.shadcn.com)

## ⚠️ 注意事項

1. **不要手動創建** Refine 已提供的組件（Layout、Views、Buttons 等）
2. **優先使用** Refine 的 hooks（`useList`, `useOne`, `useCreate` 等）而不是直接調用 API
3. **保持一致性**：所有 Refine 應用應該使用相同的組件模式
