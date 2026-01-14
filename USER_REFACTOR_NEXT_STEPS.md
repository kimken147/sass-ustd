# User Entity 重構 - 下一步操作指南

## ✅ 已完成的工作

1. **創建新的 Entity 架構**
   - ✅ BaseUser（抽象基類）
   - ✅ PlatformUser（Platform DB）
   - ✅ TenantUser（Tenant DB）

2. **更新相關 Entities**
   - ✅ Agent → 使用 TenantUser
   - ✅ Customer → 使用 TenantUser
   - ✅ Tenant → 使用 PlatformUser

3. **更新 Platform API**
   - ✅ 所有模組、服務、控制器
   - ✅ MikroORM 配置

4. **更新 Tenant API**
   - ✅ 所有模組、服務、控制器
   - ✅ MikroORM 配置

5. **生成新的 Migrations**
   - ✅ Platform API: `Migration20260114180223_InitPlatformDB.ts`
   - ✅ Tenant API: `Migration20260114180245_InitTenantDB.ts`

## 🚀 接下來需要做的事

### 1. 執行 Migrations

#### Platform API (Platform DB)
```bash
# 確保 Platform DB 環境變數已設置
cd apps/platform-api
pnpm migration:up
```

#### Tenant API (每個租戶的 DB)
```bash
# 為每個租戶執行 migration
cd apps/tenant-api

# 租戶 test001
TENANT_SLUG=test001 pnpm migration:up

# 其他租戶...
# TENANT_SLUG=tenant002 pnpm migration:up
```

### 2. 驗證資料庫 Schema

#### Platform DB
```sql
-- 檢查 users 表是否有 tenant_id
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public';

-- 應該看到 tenant_id 欄位
```

#### Tenant DB
```sql
-- 連接到 tenant_test001
\c tenant_test001

-- 檢查 users 表是否沒有 tenant_id
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public';

-- 應該沒有 tenant_id 欄位
```

### 3. 測試 API 功能

#### Platform API
```bash
# 啟動 platform-api
cd apps/platform-api
pnpm dev

# 測試登入
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

#### Tenant API
```bash
# 啟動 tenant-api
cd apps/tenant-api
TENANT_SLUG=test001 pnpm dev

# 測試登入
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tenant-admin","password":"your-password"}'
```

### 4. 常見問題排查

#### 問題 1: Migration 失敗
```bash
# 檢查資料庫連接
psql -h localhost -U postgres -d saas_platform

# 查看 migration 狀態
cd apps/platform-api
pnpm migration:pending
```

#### 問題 2: Entity 找不到
```bash
# 重新建置 database package
cd packages/database
pnpm build

# 重新建置 API
cd ../../apps/platform-api
pnpm build
```

#### 問題 3: TypeScript 錯誤
```bash
# 清除快取並重新建置
pnpm clean
pnpm install
pnpm build
```

### 5. 資料遷移（如果有舊資料）

如果你已經有舊的資料庫資料，需要進行資料遷移：

#### Platform DB
```sql
-- 舊的 users 表已經有 tenant_id，不需要遷移
-- 只需要確保外鍵約束正確
```

#### Tenant DB
```sql
-- 如果舊的 users 表有 tenant_id，需要移除它
ALTER TABLE users DROP COLUMN IF EXISTS tenant_id;
```

### 6. 清理工作

#### 刪除已棄用的檔案（可選）
```bash
# 備份舊的 user.entity.ts
cp packages/database/src/entities/user.entity.ts \
   packages/database/src/entities/user.entity.ts.backup

# 之後可以考慮刪除
# rm packages/database/src/entities/user.entity.ts
```

## 📋 檢查清單

- [ ] Platform API migration 已執行
- [ ] Tenant API migration 已執行（所有租戶）
- [ ] Platform API 可以正常啟動
- [ ] Tenant API 可以正常啟動
- [ ] Platform API 登入功能正常
- [ ] Tenant API 登入功能正常
- [ ] Agent 創建功能正常
- [ ] Customer 創建功能正常
- [ ] 資料庫 schema 驗證完成
- [ ] 所有測試通過

## 🎯 驗證步驟

### 1. 創建 Platform Admin
```bash
# 在 Platform DB 中創建管理員
# 應該能看到 tenant_id = null
```

### 2. 創建 Tenant 和 Tenant Admin
```bash
# 使用 Platform API 創建租戶
# 應該自動在 Tenant DB 中創建管理員（沒有 tenant_id）
```

### 3. 測試 Agent 和 Customer
```bash
# 使用 Tenant API 創建 Agent
# 使用 Tenant API 創建 Customer
# 驗證它們都關聯到正確的 TenantUser
```

## 📚 相關文件

- [USER_ENTITY_REFACTOR_SUMMARY.md](./USER_ENTITY_REFACTOR_SUMMARY.md) - 詳細的重構總結
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系統架構文件
- [TENANT_DB_REFACTOR_SUMMARY.md](./TENANT_DB_REFACTOR_SUMMARY.md) - Tenant DB 重構文件

## 💡 提示

1. **測試環境先測試**: 建議先在測試環境執行 migration，確認無誤後再應用到生產環境
2. **備份資料庫**: 執行 migration 前務必備份資料庫
3. **逐步驗證**: 每完成一個步驟就驗證一次，避免累積問題
4. **監控日誌**: 啟動服務時注意觀察日誌，確保沒有錯誤

## 🆘 需要幫助？

如果遇到問題：
1. 檢查 migration 文件是否正確執行
2. 查看應用程式日誌
3. 驗證資料庫 schema
4. 確認環境變數設置正確

---

**重構完成日期**: 2026-01-15  
**負責人**: AI Assistant  
**狀態**: ✅ 代碼重構完成，等待測試和部署
