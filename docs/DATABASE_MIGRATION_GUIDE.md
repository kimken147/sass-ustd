# 資料庫遷移指南 (Database Migration Guide)

本指南說明如何在當前專案結構中創建和管理資料庫遷移。

## 📋 專案結構概述

您的專案有兩個主要的 API 應用：

1. **platform-api** - 平台管理 API（管理所有租戶）
2. **tenant-api** - 租戶業務 API（每個租戶獨立部署）

## 🚀 創建遷移 (Platform API)

### 前置條件

1. 確保已安裝依賴：
```bash
pnpm install
```

2. 確保資料庫已啟動並可連接

3. 確保環境變數已配置（`.env` 文件）

### 創建新遷移

#### 方法 1：使用 npm/pnpm 腳本（推薦）

```bash
cd apps/platform-api

# 創建新的遷移文件
pnpm migration:create -- --name YourMigrationName

# 例如：創建添加新欄位的遷移
pnpm migration:create -- --name AddEmailVerifiedToUsers
```

#### 方法 2：直接使用 mikro-orm CLI

```bash
cd apps/platform-api

# 創建遷移
npx mikro-orm migration:create --name YourMigrationName
```

### 自動生成遷移（從 Entity 變更）

MikroORM 可以自動檢測 Entity 的變更並生成遷移：

```bash
cd apps/platform-api

# 檢查 schema 差異（不執行）
npx mikro-orm migration:create

# 這會比較您的 Entity 定義和資料庫實際結構
# 自動生成遷移文件
```

### 遷移文件位置

遷移文件會自動生成在：
```
apps/platform-api/src/migrations/
```

檔案命名格式：
```
Migration{YYYYMMDDHHMMSS}_{YourMigrationName}.ts
```

## 🔧 管理遷移

### 查看待執行的遷移

```bash
cd apps/platform-api
pnpm migration:pending
# 或
npx mikro-orm migration:pending
```

### 執行遷移

```bash
cd apps/platform-api

# 執行所有待執行的遷移
pnpm migration:up
# 或
npx mikro-orm migration:up

# 執行到下一個遷移
npx mikro-orm migration:up --to=Migration20251201074114_InitCryptoInvestmentSystem

# 執行到特定版本
npx mikro-orm migration:up --to=0
```

### 回滾遷移

```bash
cd apps/platform-api

# 回滾最後一個遷移
pnpm migration:down
# 或
npx mikro-orm migration:down

# 回滾到下一個遷移
npx mikro-orm migration:down --to=Migration20251201074114_InitCryptoInvestmentSystem

# 回滾所有遷移
npx mikro-orm migration:down --to=0
```

### 查看遷移狀態

```bash
cd apps/platform-api
npx mikro-orm migration:status
```

## 📝 遷移文件範例

創建遷移後，您會得到一個類似這樣的文件：

```typescript
import { Migration } from '@mikro-orm/migrations';

export class Migration20251201120000_AddEmailVerifiedToUsers extends Migration {

  override async up(): Promise<void> {
    // 在 up() 方法中定義遷移操作
    this.addSql(`alter table "users" add column "email_verified" boolean not null default false;`);
    this.addSql(`alter table "users" add column "email_verified_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    // 在 down() 方法中定義回滾操作
    this.addSql(`alter table "users" drop column "email_verified_at";`);
    this.addSql(`alter table "users" drop column "email_verified";`);
  }

}
```

### 常見遷移操作

#### 添加欄位
```typescript
this.addSql(`alter table "users" add column "new_field" varchar(255) null;`);
```

#### 刪除欄位
```typescript
this.addSql(`alter table "users" drop column "old_field";`);
```

#### 修改欄位類型
```typescript
this.addSql(`alter table "users" alter column "status" type text using "status"::text;`);
```

#### 添加索引
```typescript
this.addSql(`create index "users_email_index" on "users" ("email");`);
```

#### 刪除索引
```typescript
this.addSql(`drop index if exists "users_email_index";`);
```

#### 添加外鍵約束
```typescript
this.addSql(`alter table "users" add constraint "users_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id") on update cascade on delete set null;`);
```

#### 刪除外鍵約束
```typescript
this.addSql(`alter table "users" drop constraint "users_tenant_id_foreign";`);
```

#### 創建表
```typescript
this.addSql(`create table "new_table" (
  "id" serial primary key,
  "name" varchar(255) not null,
  "created_at" timestamptz not null
);`);
```

#### 刪除表
```typescript
this.addSql(`drop table if exists "new_table" cascade;`);
```

## 🔄 Tenant API 遷移

**注意**：`tenant-api` 目前沒有配置遷移腳本。如果您需要為 tenant-api 創建遷移，需要：

### 1. 創建 MikroORM 配置文件

在 `apps/tenant-api/` 目錄創建 `mikro-orm.config.ts`：

```typescript
import { defineConfig } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { Migrator } from "@mikro-orm/migrations";
import {
  Tenant,
  User,
  Agent,
  Customer,
  CommissionPayout,
  RevenueDistribution,
  SystemFeeDistribution,
} from "@saas-platform/database";

export default defineConfig({
  driver: PostgreSqlDriver,
  
  host: process.env.TENANT_DB_HOST || "localhost",
  port: parseInt(process.env.TENANT_DB_PORT || "5432"),
  user: process.env.TENANT_DB_USER || "postgres",
  password: process.env.TENANT_DB_PASSWORD || "postgres",
  dbName: `${process.env.TENANT_DB_NAME || "tenant"}_${process.env.TENANT_ID || "test_001"}`,
  
  entities: [
    Tenant,
    User,
    Agent,
    Customer,
    CommissionPayout,
    RevenueDistribution,
    SystemFeeDistribution,
  ],
  
  migrations: {
    path: "./src/migrations",
    pathTs: "./src/migrations",
    tableName: "mikro_orm_migrations",
    transactional: true,
    disableForeignKeys: false,
    allOrNothing: true,
    emit: "ts",
  },
  
  debug: process.env.NODE_ENV === "development",
  extensions: [Migrator],
});
```

### 2. 添加遷移腳本到 package.json

在 `apps/tenant-api/package.json` 的 `scripts` 區塊添加：

```json
{
  "scripts": {
    "migration:create": "mikro-orm migration:create",
    "migration:up": "mikro-orm migration:up",
    "migration:down": "mikro-orm migration:down",
    "migration:pending": "mikro-orm migration:pending"
  }
}
```

### 3. 使用方式

```bash
cd apps/tenant-api

# 創建遷移
pnpm migration:create -- --name YourMigrationName

# 執行遷移
pnpm migration:up
```

## ⚠️ 重要注意事項

### 1. 環境變數

確保在執行遷移前設置正確的環境變數：

**Platform API**:
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

**Tenant API**:
- `TENANT_DB_HOST`
- `TENANT_DB_PORT`
- `TENANT_DB_USER`
- `TENANT_DB_PASSWORD`
- `TENANT_DB_NAME`
- `TENANT_ID`

### 2. 遷移順序

- 遷移會按照檔案名稱的時戳順序執行
- 每個遷移在交易中執行（`transactional: true`）
- 如果遷移失敗，會自動回滾（`allOrNothing: true`）

### 3. 生產環境

**⚠️ 生產環境警告**：

- 在執行遷移前，**務必備份資料庫**
- 先在測試環境測試遷移
- 檢查遷移的 `down()` 方法是否正確
- 考慮在低流量時段執行遷移

### 4. 協作開發

- 將遷移文件提交到版本控制（Git）
- 不要修改已經執行過的遷移文件
- 如果必須修改，創建新的遷移來修正

## 📚 相關命令完整列表

### Platform API

```bash
cd apps/platform-api

# 創建遷移
pnpm migration:create -- --name MigrationName

# 執行遷移
pnpm migration:up

# 回滾遷移
pnpm migration:down

# 查看待執行的遷移
pnpm migration:pending

# 查看遷移狀態
npx mikro-orm migration:status

# 檢查 schema 差異（不生成遷移）
npx mikro-orm schema:update --dry-run
```

## 🎯 快速參考

### 典型工作流程

1. **修改 Entity**
   ```typescript
   // packages/database/src/entities/user.entity.ts
   @Property()
   emailVerified: boolean = false;
   ```

2. **生成遷移**
   ```bash
   cd apps/platform-api
   pnpm migration:create
   ```

3. **檢查生成的遷移文件**
   ```bash
   cat src/migrations/Migration*.ts
   ```

4. **測試遷移**
   ```bash
   # 在開發環境執行
   pnpm migration:up
   ```

5. **如果需回滾**
   ```bash
   pnpm migration:down
   ```

6. **提交到版本控制**
   ```bash
   git add src/migrations/
   git commit -m "Add email verification field to users"
   ```

## 📖 更多資源

- [MikroORM 遷移文檔](https://mikro-orm.io/docs/migrations)
- [MikroORM CLI 命令](https://mikro-orm.io/docs/migrations#migration-commands)
- 專案文檔：
  - `docs/MIKROORM_SETUP.md` - MikroORM 設置指南
  - `docs/POSTGRESQL_DOCKER_SETUP.md` - PostgreSQL 設置

---

**提示**：如果您遇到問題，請檢查：
1. 資料庫連接是否正常
2. 環境變數是否正確設置
3. 遷移文件是否有語法錯誤
4. 資料庫權限是否足夠
