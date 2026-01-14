# User Entity 重構 - 快速參考

## 📦 新增的檔案

```
packages/database/src/entities/
├── user-base.entity.ts      (BaseUser - 抽象基類)
├── user-platform.entity.ts  (PlatformUser - Platform DB)
└── user-tenant.entity.ts    (TenantUser - Tenant DB)

apps/platform-api/src/migrations/
└── Migration20260114180223_InitPlatformDB.ts

apps/tenant-api/src/migrations/
└── Migration20260114180245_InitTenantDB.ts
```

## 🔄 Entity 使用對照表

| Entity | 舊引用 | 新引用 | 使用場景 |
|--------|--------|--------|----------|
| Platform API | `User` | `PlatformUser` | Platform DB (包含 tenant_id) |
| Tenant API | `User` | `TenantUser` | Tenant DB (不含 tenant_id) |
| Agent | `User` | `TenantUser` | 只在 Tenant DB |
| Customer | `User` | `TenantUser` | 只在 Tenant DB |
| Tenant | `User` | `PlatformUser` | 只在 Platform DB |

## 📝 Import 語句變更

### Platform API
```typescript
// 舊的
import { User } from '@saas-platform/database';

// 新的
import { PlatformUser } from '@saas-platform/database';
```

### Tenant API
```typescript
// 舊的
import { User } from '@saas-platform/database';

// 新的
import { TenantUser } from '@saas-platform/database';
```

## 🗄️ 資料庫差異

### Platform DB - users 表
```sql
-- 有 tenant_id 外鍵
tenant_id INT NULL
FOREIGN KEY (tenant_id) REFERENCES tenants(id)

-- 複合唯一索引
UNIQUE (username, tenant_id)
UNIQUE (email, tenant_id)
```

### Tenant DB - users 表
```sql
-- 沒有 tenant_id

-- 單欄位唯一索引
UNIQUE (username)
UNIQUE (email)
```

## ⚡ 快速執行

```bash
# 1. 執行 Platform migration
cd apps/platform-api
pnpm migration:up

# 2. 執行 Tenant migration
cd apps/tenant-api
TENANT_SLUG=test001 pnpm migration:up

# 3. 啟動服務測試
cd apps/platform-api && pnpm dev  # Terminal 1
cd apps/tenant-api && TENANT_SLUG=test001 pnpm dev  # Terminal 2
```

## ✅ 重構完成確認

- [x] BaseUser 抽象基類已創建
- [x] PlatformUser entity 已創建
- [x] TenantUser entity 已創建
- [x] Agent/Customer/Tenant entities 已更新
- [x] Platform API 所有模組已更新
- [x] Tenant API 所有模組已更新
- [x] Migrations 已生成
- [ ] Migrations 已執行
- [ ] 服務啟動測試
- [ ] 功能測試

## 📄 詳細文件

- [USER_ENTITY_REFACTOR_SUMMARY.md](./USER_ENTITY_REFACTOR_SUMMARY.md) - 完整重構說明
- [USER_REFACTOR_NEXT_STEPS.md](./USER_REFACTOR_NEXT_STEPS.md) - 下一步操作指南
