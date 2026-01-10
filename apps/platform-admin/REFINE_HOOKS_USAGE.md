# Refine Hooks 使用檢查報告

## ✅ 檢查結果

經過檢查，`platform-admin` 中的所有頁面都已正確使用 Refine 的 hooks，沒有發現直接 API 調用的問題。

## 📋 頁面檢查

### 1. LoginPage.tsx ✅
- **使用**: `useLogin` hook
- **狀態**: ✅ 正確使用 Refine hooks
- **說明**: 使用 `useLogin` 處理登入邏輯，符合 Refine 最佳實踐

### 2. DashboardPage.tsx ✅
- **使用**: `useCustom` hook
- **狀態**: ✅ 正確使用 Refine hooks
- **說明**: 
  - 使用 `useCustom` 獲取站點列表數據
  - 使用 `useApiUrl` 獲取 API 基礎 URL
  - 使用 `useMemo` 優化查詢參數

## 🔍 Providers 檢查

### dataProvider.tsx ✅
- **狀態**: ✅ 正常
- **說明**: Provider 層應該使用 API client，這是正確的架構設計
- **功能**:
  - `getList` - 使用 `useList` hook 時調用
  - `getOne` - 使用 `useOne` hook 時調用
  - `create` - 使用 `useCreate` hook 時調用
  - `update` - 使用 `useUpdate` hook 時調用
  - `deleteOne` - 使用 `useDelete` hook 時調用
  - `custom` - 使用 `useCustom` hook 時調用

### authProvider.tsx ✅
- **狀態**: ✅ 正常
- **說明**: Auth Provider 應該使用 API client 處理認證邏輯，這是正確的架構設計

## 📚 Refine Hooks 使用指南

### 何時使用哪個 Hook？

#### 1. **useList** - 獲取列表數據
```tsx
const { data, isLoading, isError } = useList({
  resource: "sites",
  filters: [{ field: "status", operator: "eq", value: "active" }],
  pagination: { current: 1, pageSize: 10 },
});
```

**適用場景**:
- 標準的列表查詢
- API 返回格式符合 Refine 標準：`{ data: [], total: number }`

#### 2. **useCustom** - 自定義 API 請求
```tsx
const { query, result } = useCustom<CustomResponse>({
  url: `${apiUrl}/sites`,
  method: "get",
  config: {
    query: { customParam: "value" },
  },
});
```

**適用場景**:
- API 返回格式特殊（如包含 `totalStats`）
- 需要自定義查詢參數
- 非標準的 CRUD 操作

#### 3. **useOne** - 獲取單個資源
```tsx
const { data, isLoading } = useOne({
  resource: "sites",
  id: 1,
});
```

#### 4. **useCreate** - 創建資源
```tsx
const { mutate } = useCreate();
mutate({ resource: "sites", values: { name: "新站點" } });
```

#### 5. **useUpdate** - 更新資源
```tsx
const { mutate } = useUpdate();
mutate({ resource: "sites", id: 1, values: { name: "更新站點" } });
```

#### 6. **useDelete** - 刪除資源
```tsx
const { mutate } = useDelete();
mutate({ resource: "sites", id: 1 });
```

## ⚠️ 不應該做的事

### ❌ 不要在頁面組件中直接使用 API Client
```tsx
// ❌ 錯誤做法
const client = getPlatformApiClient();
const response = await client.request({ ... });
```

### ✅ 應該使用 Refine Hooks
```tsx
// ✅ 正確做法
const { query, result } = useCustom({ ... });
```

## 🎯 當前實現狀態

### DashboardPage.tsx
- ✅ 使用 `useCustom` hook
- ✅ 使用 `useApiUrl` hook
- ✅ 使用 `useMemo` 優化查詢參數
- ✅ 使用 Refine 官方組件（ListView, ListViewHeader, EditButton）

### LoginPage.tsx
- ✅ 使用 `useLogin` hook
- ✅ 正確處理錯誤狀態

## 📝 最佳實踐

1. **優先使用 Refine Hooks**：`useList`, `useOne`, `useCreate`, `useUpdate`, `useDelete`
2. **特殊情況使用 `useCustom`**：當 API 返回格式不符合標準時
3. **Provider 層使用 API Client**：dataProvider 和 authProvider 應該直接使用 API client
4. **頁面組件使用 Hooks**：所有頁面組件都應該使用 Refine hooks，而不是直接調用 API

## 🔄 未來改進建議

如果站點列表 API 的返回格式可以調整為符合 Refine 標準，可以考慮：

1. **修改 dataProvider.getList** 來處理特殊的響應格式
2. **使用 `useList` 替代 `useCustom`**
3. **將 `totalStats` 作為 meta 數據處理**

但目前的實現（使用 `useCustom`）也是完全正確和合理的。
