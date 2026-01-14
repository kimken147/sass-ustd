# Tenant DB 重構總結

## 問題描述

在重構 tenant db 時，發現以下問題：

1. **Migration 問題**：有多個手動建立的 migration 文件，應該使用 `migration:create` 自動生成
2. **資料庫 Schema 不一致**：
   - 錯誤訊息：`column u1.tenant_id does not exist`
   - 原因：User entity 在 packages/database 中定義了 `tenant` 關聯（ManyToOne），MikroORM 會自動映射為 `tenant_id` 欄位
   - 但在 tenant db 的設計中，不應該有 `tenant_id`（因為是單租戶資料庫）

## 解決方案

### 1. 清理手動建立的 Migration

刪除以下手動建立的 migration 文件：
- `Migration20260114072918.ts`
- `Migration20260114172549.ts`
- `Migration20260114173829.ts`
- `Migration20260115100000.ts`

保留初始 migration：
- `Migration20260112082540.ts`

### 2. 修復 MikroORM 配置

#### 2.1 修改 `mikro-orm.config.ts`

```typescript
// 使用 TenantConfig 而不是 Tenant
import {
  TenantConfig,  // ✅ 正確：用於 Tenant DB
  // Tenant,     // ❌ 錯誤：用於 Platform DB
  User,
  Agent,
  Customer,
  CommissionPayout,
  RevenueDistribution,
  SystemFeeDistribution,
} from "@saas-platform/database";

entities: [
  TenantConfig,  // ✅ tenant_config 表
  User,
  Agent,
  Customer,
  CommissionPayout,
  RevenueDistribution,
  SystemFeeDistribution,
],

// 添加 discovery 配置
discovery: {
  warnWhenNoEntities: true,
  requireEntitiesArray: true,      // 要求明確指定 entities
  disableDynamicFileAccess: true,  // 禁用動態文件訪問
},
```

#### 2.2 修改 `app.module.ts`

同樣的配置更新，確保與 `mikro-orm.config.ts` 保持一致。

### 3. 創建重構 Migration

使用 `migration:create` 自動生成 migration：

```bash
TENANT_SLUG=test001 pnpm migration:create --name=refactor_to_tenant_config
```

這個 migration 執行以下操作：

1. 創建 `tenant_config` 表（取代 `tenants` 表）
2. 移除各表的 `tenant_id` 外鍵約束
3. 移除各表的 `tenant_id` 列
4. 更新 `users` 表的唯一約束（不再需要 `tenant_id`）
5. 更新 `agents` 表的唯一約束（不再需要 `tenant_id`）
6. 移除 `tenants` 表

### 4. 執行 Migration

```bash
TENANT_SLUG=test001 pnpm migration:up
```

## 架構說明

### Platform DB vs Tenant DB

**Platform DB（總後台資料庫）**:
- 使用 `Tenant` entity（`tenants` 表）
- 存放所有租戶的資料
- User entity 有 `tenant` 關聯（ManyToOne）

**Tenant DB（租戶資料庫）**:
- 使用 `TenantConfig` entity（`tenant_config` 表）
- 每個租戶一個獨立資料庫
- 不需要 `tenant_id` 欄位（因為整個資料庫就是單一租戶的）
- User entity 的 `tenant` 關聯在這裡不會被映射到資料庫欄位

### Entity 對照表

| Entity | Platform DB 表名 | Tenant DB 表名 | 說明 |
|--------|-----------------|---------------|------|
| Tenant | `tenants` | - | 只存在於 Platform DB |
| TenantConfig | - | `tenant_config` | 只存在於 Tenant DB，從 Platform DB 同步 |
| User | `users` | `users` | Platform DB 有 tenant_id，Tenant DB 沒有 |
| Agent | `agents` | `agents` | Platform DB 有 tenant_id，Tenant DB 沒有 |
| Customer | `customers` | `customers` | Platform DB 有 tenant_id，Tenant DB 沒有 |

## 驗證

### 1. 檢查 Migration 狀態

```bash
TENANT_SLUG=test001 pnpm migration:pending
# 應該顯示：No pending migrations
```

### 2. 檢查應用啟動

```bash
pnpm dev
# 應該成功啟動，沒有 "column u1.tenant_id does not exist" 錯誤
```

### 3. 測試 API

```bash
curl http://localhost:3001/api/customers
# 應該回傳 401 Unauthorized（正常，需要認證）
# 而不是資料庫錯誤
```

## 最終檔案清單

### Migration 文件
```
apps/tenant-api/src/migrations/
├── .snapshot-tenant_test001.json
├── Migration20260112082540.ts           # 初始 migration（保留）
└── Migration20260114174540_refactor_to_tenant_config.ts  # 重構 migration
```

### 配置文件
```
apps/tenant-api/
├── mikro-orm.config.ts                  # ✅ 已更新
└── src/
    ├── app.module.ts                    # ✅ 已更新
    └── modules/
        └── customers/
            └── customers.service.ts     # ✅ 已檢查（無需修改）
```

## 注意事項

1. **不要手動建立 Migration**：始終使用 `pnpm migration:create` 自動生成
2. **Entity 選擇**：
   - Platform DB：使用 `Tenant`
   - Tenant DB：使用 `TenantConfig`
3. **Discovery 配置**：
   - `requireEntitiesArray: true`：強制明確指定 entities
   - `disableDynamicFileAccess: true`：禁用自動發現，避免載入不需要的 entities
4. **User Entity**：在 Tenant DB 中，User 的 `tenant` 關聯不會被映射到資料庫（因為沒有註冊 Tenant entity）

## 未來改進建議

1. 考慮為 Tenant DB 創建專用的 Entity 定義，避免與 Platform DB 共享
2. 在 CI/CD 中添加 migration 檢查，確保所有 migration 都已執行
3. 添加自動化測試，驗證 Tenant DB 的 schema 正確性

---

**修復日期**: 2026-01-15  
**修復人員**: AI Assistant  
**狀態**: ✅ 已完成並測試
