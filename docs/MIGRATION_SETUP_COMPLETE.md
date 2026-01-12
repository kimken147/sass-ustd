# ✅ 遷移配置完成

## 🎉 已完成的工作

### 1. Tenant API 遷移配置 ✅

- ✅ 創建了 `apps/tenant-api/mikro-orm.config.ts` 配置文件
- ✅ 在 `apps/tenant-api/package.json` 中添加了遷移腳本
- ✅ 添加了 `@mikro-orm/cli` 依賴
- ✅ 創建了初始遷移文件：`Migration20260112162004_InitTenantDatabase.ts`

### 2. Platform API 遷移配置 ✅

- ✅ 已經有完整的遷移配置
- ✅ 已經有遷移腳本
- ✅ 已經有初始遷移文件：`Migration20251201074114_InitCryptoInvestmentSystem.ts`

## 🚀 使用方式

### Platform API 遷移

```bash
cd apps/platform-api

# 創建新遷移（自動檢測 Entity 變更）
pnpm migration:create -- --name YourMigrationName

# 或自動生成遷移
pnpm migration:create

# 執行遷移
pnpm migration:up

# 回滾遷移
pnpm migration:down

# 查看待執行的遷移
pnpm migration:pending
```

### Tenant API 遷移

**重要**：使用 tenant-api 遷移前，需要設置 `TENANT_ID` 環境變數。

```bash
cd apps/tenant-api

# 設置環境變數（必需）
export TENANT_ID=test_001

# 創建新遷移（自動檢測 Entity 變更）
pnpm migration:create -- --name YourMigrationName

# 或自動生成遷移
pnpm migration:create

# 執行遷移
pnpm migration:up

# 回滾遷移
pnpm migration:down

# 查看待執行的遷移
pnpm migration:pending
```

### 環境變數設置

#### Platform API

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=saas_platform
```

#### Tenant API

```env
TENANT_DB_HOST=localhost
TENANT_DB_PORT=5432
TENANT_DB_USER=postgres
TENANT_DB_PASSWORD=postgres
TENANT_DB_NAME=tenant
TENANT_ID=test_001  # ⚠️ CLI 使用時必需
```

## 📁 文件結構

```
apps/
├── platform-api/
│   ├── mikro-orm.config.ts          ✅ 已存在
│   ├── package.json                 ✅ 已有遷移腳本
│   └── src/
│       └── migrations/
│           └── Migration20251201074114_InitCryptoInvestmentSystem.ts  ✅
│
└── tenant-api/
    ├── mikro-orm.config.ts          ✅ 新創建
    ├── package.json                 ✅ 已更新（添加遷移腳本和 CLI）
    └── src/
        └── migrations/
            └── Migration20260112162004_InitTenantDatabase.ts  ✅ 新創建
```

## ⚠️ 注意事項

### Tenant API 特殊要求

1. **TENANT_ID 環境變數**：在使用 CLI 命令時必須設置，因為資料庫名稱是動態的（`tenant_${TENANT_ID}`）
2. **多租戶資料庫**：每個租戶有獨立的資料庫，需要在不同租戶上分別執行遷移

### 遷移最佳實踐

1. **版本控制**：所有遷移文件都應該提交到 Git
2. **測試**：在執行生產環境遷移前，先在測試環境測試
3. **備份**：生產環境執行遷移前務必備份資料庫
4. **順序**：遷移按時間戳順序執行，不要修改已執行的遷移文件

## 📚 相關文檔

- `docs/DATABASE_MIGRATION_GUIDE.md` - 完整的遷移指南
- `docs/MIKROORM_SETUP.md` - MikroORM 設置指南

## 🔄 下一步

1. 安裝依賴（如果還沒有）：
   ```bash
   pnpm install
   ```

2. 配置環境變數（`.env` 文件）

3. 執行初始遷移：
   ```bash
   # Platform API
   cd apps/platform-api
   pnpm migration:up
   
   # Tenant API
   cd apps/tenant-api
   export TENANT_ID=test_001
   pnpm migration:up
   ```

---

**配置完成！現在可以開始使用遷移功能了！** 🎉
