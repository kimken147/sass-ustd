# User Entity 重構總結

## 重構目標

將 User entity 重構為基於繼承的架構，分離 Platform DB 和 Tenant DB 的使用場景。

## 架構設計

### 1. BaseUser（抽象基類）
- **檔案位置**: `packages/database/src/entities/user-base.entity.ts`
- **用途**: 包含所有 User 共享的欄位
- **特點**: 
  - 抽象類，不會直接實例化
  - 包含基本資訊、角色、狀態、安全設置、登入資訊等

### 2. PlatformUser（Platform DB）
- **檔案位置**: `packages/database/src/entities/user-platform.entity.ts`
- **用途**: Platform API 使用，管理跨租戶的用戶
- **特點**:
  - 繼承 BaseUser
  - 包含 `@ManyToOne(() => Tenant)` 關聯
  - Platform Admin 的 tenant 為 null
  - 複合唯一索引: `(email, tenant_id)` 和 `(username, tenant_id)`

### 3. TenantUser（Tenant DB）
- **檔案位置**: `packages/database/src/entities/user-tenant.entity.ts`
- **用途**: Tenant API 使用，單租戶資料庫中的用戶
- **特點**:
  - 繼承 BaseUser
  - **不包含** tenant 關聯（單租戶資料庫）
  - 唯一索引: `email` 和 `username`（無需 tenant_id）

## 相關 Entity 更新

### Agent Entity
- 引用從 `User` 改為 `TenantUser`
- 只在 Tenant DB 中使用

### Customer Entity
- 引用從 `User` 改為 `TenantUser`
- 只在 Tenant DB 中使用

### Tenant Entity
- OneToMany 關聯從 `User` 改為 `PlatformUser`
- 只在 Platform DB 中使用

## API 更新

### Platform API
**更新的檔案**:
- `apps/platform-api/src/app.module.ts` - entities: `[Tenant, PlatformUser, SystemWallet]`
- `apps/platform-api/src/modules/auth/auth.module.ts`
- `apps/platform-api/src/modules/auth/auth.service.ts`
- `apps/platform-api/src/modules/auth/auth.controller.ts`
- `apps/platform-api/src/modules/auth/strategies/jwt.strategy.ts`
- `apps/platform-api/src/modules/auth/decorators/current-user.decorator.ts`
- `apps/platform-api/src/modules/tenants/tenant-migration.service.ts`
- `apps/platform-api/mikro-orm.config.ts`

### Tenant API
**更新的檔案**:
- `apps/tenant-api/src/app.module.ts` - entities: `[TenantConfig, TenantUser, Agent, Customer, ...]`
- `apps/tenant-api/src/modules/auth/auth.module.ts`
- `apps/tenant-api/src/modules/auth/auth.service.ts`
- `apps/tenant-api/src/modules/auth/auth.controller.ts`
- `apps/tenant-api/src/modules/auth/strategies/jwt.strategy.ts`
- `apps/tenant-api/src/modules/auth/decorators/current-user.decorator.ts`
- `apps/tenant-api/src/modules/agents/agents.module.ts`
- `apps/tenant-api/src/modules/agents/agents.service.ts`
- `apps/tenant-api/src/modules/agents/agents.controller.ts`
- `apps/tenant-api/src/modules/customers/customers.controller.ts`
- `apps/tenant-api/src/modules/contracts/contracts.module.ts`
- `apps/tenant-api/src/modules/contracts/contracts.service.ts`
- `apps/tenant-api/src/modules/transactions/transactions.controller.ts`
- `apps/tenant-api/mikro-orm.config.ts`

## Migrations

### Platform API
- **新 Migration**: `Migration20260114180223_InitPlatformDB.ts`
- **Schema**:
  - `system_wallets` 表
  - `tenants` 表
  - `users` 表（包含 tenant_id 外鍵）

### Tenant API
- **新 Migration**: `Migration20260114180245_InitTenantDB.ts`
- **Schema**:
  - `tenant_config` 表
  - `users` 表（不包含 tenant_id）
  - `agents` 表
  - `customers` 表
  - `system_fee_distributions` 表
  - `revenue_distributions` 表
  - `commission_payouts` 表

## Database Package 導出

**更新的檔案**: `packages/database/src/entities/index.ts`

新增導出：
```typescript
export * from './user-base.entity';      // BaseUser
export * from './user-platform.entity';  // PlatformUser
export * from './user-tenant.entity';    // TenantUser
export * from './user.entity';           // 保留舊的 User（已棄用）
```

## 重構優勢

1. **清晰的職責分離**: Platform DB 和 Tenant DB 使用不同的 User entity
2. **類型安全**: TypeScript 可以在編譯時檢查使用了錯誤的 entity
3. **避免欄位混淆**: Tenant DB 不會有多餘的 tenant_id 欄位
4. **更好的可維護性**: 各個 DB 的 schema 更加清晰
5. **符合單一職責原則**: 每個 entity 只服務一個資料庫

## 向後兼容

- 舊的 `User` entity 仍然被導出，但建議使用新的 `PlatformUser` 或 `TenantUser`
- 可以在適當時機完全移除舊的 `User` entity

## 資料庫 Schema 差異

### Platform DB users 表
```sql
-- 包含 tenant_id（可為 null）
CREATE TABLE users (
  ...,
  tenant_id INT NULL,
  CONSTRAINT users_tenant_id_foreign FOREIGN KEY (tenant_id) 
    REFERENCES tenants(id)
);
```

### Tenant DB users 表
```sql
-- 不包含 tenant_id
CREATE TABLE users (
  ...,
  -- 無 tenant_id 欄位
);
```

## 下一步建議

1. ✅ 執行 migrations（平台資料庫和租戶資料庫）
2. ✅ 測試 API 功能
3. 考慮在未來完全移除舊的 `User` entity
4. 更新相關文件和 README

---

**重構完成時間**: 2026-01-15  
**重構內容**: BaseUser + PlatformUser/TenantUser 繼承架構
