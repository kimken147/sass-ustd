# Tenant DB 架構重構說明

## 概述

本次重構簡化了多租戶架構，移除了獨立租戶資料庫中不必要的 `tenant` 關聯和 `tenants` 表。

## 變更背景

在「獨立資料庫（Database per Tenant）」模式下，每個租戶有自己獨立的資料庫（`tenant_{slug}`）。由於整個資料庫都屬於同一個租戶，因此：

1. **不需要 `tenants` 表** - 只需要一個配置表 `tenant_config` 來存放從 Platform DB 同步的配置
2. **不需要 `tenant_id` 欄位** - 所有表的資料都屬於同一租戶

## 主要變更

### 1. 新增 `TenantConfig` Entity

取代原本的 `Tenant` Entity，用於存放租戶配置：

```typescript
@Entity({ tableName: "tenant_config" })
export class TenantConfig {
  @PrimaryKey()
  id: number = 1; // 永遠只有一筆

  @Property()
  slug!: string;

  @Property()
  name!: string;

  @Property({ type: "decimal", precision: 5, scale: 2 })
  systemFeeRate: number = 10.0;

  @Property({ type: "json" })
  cryptoConfig: TenantCryptoConfig = { ... };

  @Property({ type: "json" })
  revenueWallets: RevenueWallet[] = [];

  @Property({ type: "json", nullable: true })
  systemWallets?: SystemWalletAssignment[];

  // ... 其他配置
}
```

### 2. 移除 Entity 中的 `tenant` 關聯

以下 Entity 不再需要 `tenant` 關聯：
- `User` - `tenant` 欄位改為 nullable（保留給 Platform DB 使用）
- `Agent` - 移除 `tenant` 關聯
- `Customer` - 移除 `tenant` 關聯
- `SystemFeeDistribution` - 移除 `tenant` 關聯
- `RevenueDistribution` - 移除 `tenant` 關聯
- `CommissionPayout` - 移除 `tenant` 關聯

### 3. 環境變數變更

```bash
# 舊的（已移除）
TENANT_ID=test009

# 新的
TENANT_SLUG=test009
```

### 4. Auth 配置變更

新增 `tenantMode` 配置取代 `requireTenant`：

```typescript
export type TenantMode = "required" | "none" | "skip";

export interface AuthConfig {
  allowedRoles: UserRole[];
  tenantMode: TenantMode;
  apiName: string;
}
```

- `required`: Platform DB 中，查詢有租戶關聯的用戶
- `none`: Platform DB 中，查詢沒有租戶關聯的用戶（Platform Admin）
- `skip`: Tenant DB 中，不添加租戶條件（整個 DB 都是同一租戶）

## 資料庫 Migration

新增 `Migration20260115100000.ts`：

1. 創建 `tenant_config` 表
2. 移除各表的 `tenant_id` 外鍵約束
3. 移除各表的 `tenant_id` 欄位
4. 更新唯一約束（移除 `tenant_id` 的複合唯一約束）
5. 刪除 `tenants` 表

## 配置同步機制

當 Platform DB 中的租戶配置更新時，會自動同步到對應的 Tenant DB：

```typescript
// tenants.service.ts
async update(id: number, updateTenantDto: UpdateTenantDto) {
  // ... 更新 Platform DB
  
  // 同步配置到 Tenant DB
  await this.tenantMigrationService.syncTenantConfig(tenant.slug, tenant);
  
  return tenant;
}
```

## 遷移步驟（現有系統）

如果您有現有的租戶資料庫，請按照以下步驟遷移：

### 1. 備份資料

```bash
pg_dump tenant_xxx > tenant_xxx_backup.sql
```

### 2. 更新環境變數

```bash
# .env
TENANT_SLUG=xxx  # 改用 TENANT_SLUG
```

### 3. 執行 Migration

Migration 會自動：
- 創建 `tenant_config` 表
- 移除 `tenant_id` 相關欄位和約束
- 刪除 `tenants` 表

### 4. 初始化 `tenant_config`

如果是手動遷移，需要插入一筆 `tenant_config` 記錄：

```sql
INSERT INTO tenant_config (id, slug, name, system_fee_rate, crypto_config, revenue_wallets)
SELECT 1, slug, name, system_fee_rate, crypto_config, revenue_wallets
FROM tenants
LIMIT 1;
```

## API 變更

### 移除 `tenantId` 參數

所有 tenant-api 的方法不再需要 `tenantId` 參數：

```typescript
// 舊的
async login(loginDto: LoginDto, tenantId?: number)
async getAgents(tenantId: number)

// 新的
async login(loginDto: LoginDto)
async getAgents()
```

### 移除 `X-Tenant-Id` Header

不再需要傳送 `X-Tenant-Id` header，因為整個 API 實例就是為單一租戶服務。

## 注意事項

1. **Platform API 不受影響** - 此重構只影響 Tenant API 和獨立的 Tenant DB
2. **Platform DB 保留 `tenants` 表** - Platform DB 仍然使用 `tenants` 表來管理所有租戶
3. **向後兼容** - `User` Entity 的 `tenant` 欄位仍然存在（nullable），以支持 Platform DB 的使用場景
