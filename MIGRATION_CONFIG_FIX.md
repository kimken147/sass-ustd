# Migration 配置修復總結

## 🐛 問題根源

### 發現的問題
1. **原有正確資料庫**：`tenant_test001`（由應用創建，TENANT_SLUG=test001）
2. **錯誤創建的資料庫**：`tenant_test_001`（由 migration CLI 創建）

### 問題原因

**配置不一致**：

| 位置 | 環境變數 | 資料庫名稱 | 狀態 |
|------|---------|-----------|------|
| `app.module.ts`（應用運行） | `TENANT_SLUG=test001` | `tenant_test001` | ✅ 正確 |
| `mikro-orm.config.ts`（migration CLI） | `TENANT_ID`（默認 `test_001`） | `tenant_test_001` | ❌ 錯誤 |

**根本原因**：
- `app.module.ts` 使用 `TENANT_SLUG` 環境變數
- `mikro-orm.config.ts` 使用 `TENANT_ID` 環境變數（且有錯誤的默認值）
- 導致應用和 migration CLI 連接到不同的資料庫

## ✅ 已執行的修復

### 1. 修改 `mikro-orm.config.ts`

**修改前**：
```typescript
dbName: `${process.env.TENANT_DB_NAME || "tenant"}_${process.env.TENANT_ID || "test_001"}`,
```

**修改後**：
```typescript
dbName: `tenant_${process.env.TENANT_SLUG || "test001"}`,
```

### 2. 刪除錯誤的 snapshot 文件
- ✅ 已刪除 `.snapshot-tenant_test_001.json`

### 3. 準備清理腳本
- ✅ 創建了 `scripts/cleanup-wrong-db.sql`

## 🔧 後續清理步驟

### 步驟 1：刪除錯誤創建的資料庫

```bash
# 方法 1：使用準備好的 SQL 腳本
psql -h localhost -U postgres -d postgres -f scripts/cleanup-wrong-db.sql

# 方法 2：手動執行
psql -h localhost -U postgres -d postgres -c "DROP DATABASE IF EXISTS tenant_test_001;"
```

### 步驟 2：驗證配置

```bash
# 1. 確認環境變數
grep TENANT_SLUG apps/tenant-api/.env

# 2. 驗證資料庫連接
psql -h localhost -U postgres -d postgres -c "SELECT datname FROM pg_database WHERE datname LIKE 'tenant%';"

# 應該只看到：tenant_test001
```

### 步驟 3：重新生成正確的 snapshot

```bash
cd apps/tenant-api
pnpm migration:create
```

這會創建正確的 `.snapshot-tenant_test001.json`

## 📋 驗證清單

- [x] 修改 `mikro-orm.config.ts` 使用 `TENANT_SLUG`
- [x] 刪除錯誤的 snapshot 文件
- [ ] 刪除錯誤的資料庫 `tenant_test_001`（需要手動執行 SQL）
- [ ] 驗證只存在 `tenant_test001` 資料庫
- [ ] 測試 migration 命令是否正確連接

## 🎯 最終配置

### 環境變數（`.env`）
```bash
TENANT_SLUG=test001
```

### 資料庫命名規則
```
格式：tenant_{slug}
範例：tenant_test001
```

### 一致性確認
- ✅ `app.module.ts`：`tenant_${TENANT_SLUG}` = `tenant_test001`
- ✅ `mikro-orm.config.ts`：`tenant_${TENANT_SLUG}` = `tenant_test001`
- ✅ Platform API：創建資料庫時使用 `tenant_${slug}`

## 🚀 測試命令

修復後，測試以下命令確保都連接到正確的資料庫：

```bash
# 1. 啟動應用（應連接到 tenant_test001）
pnpm dev

# 2. 執行 migration（應連接到 tenant_test001）
pnpm migration:up

# 3. 創建新 migration（應創建 .snapshot-tenant_test001.json）
pnpm migration:create

# 4. 檢查待執行的 migration
pnpm migration:pending
```

## ⚠️ 重要提醒

1. **統一使用 `TENANT_SLUG`**：所有配置都應使用 `TENANT_SLUG` 環境變數
2. **資料庫命名格式**：統一為 `tenant_{slug}`（不要有額外的底線）
3. **Migration 執行前**：確認 `TENANT_SLUG` 環境變數已正確設置
4. **多租戶環境**：每個租戶的 tenant-api 實例應有獨立的 `.env` 文件

## 📚 相關文件

- `apps/tenant-api/mikro-orm.config.ts` - Migration CLI 配置
- `apps/tenant-api/src/app.module.ts` - 應用資料庫配置
- `apps/tenant-api/.env` - 環境變數
- `apps/platform-api/src/modules/tenants/tenants.service.ts` - 租戶資料庫創建邏輯
