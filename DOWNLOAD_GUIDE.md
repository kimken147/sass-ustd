# 專案下載指南

## 📦 壓縮檔資訊

**檔案名稱**：`saas-platform-structure.tar.gz`  
**檔案大小**：78 KB  
**包含檔案**：51 個檔案

## 📥 下載方式

### 方式 1：直接下載連結

[下載完整專案壓縮檔](computer:///mnt/user-data/outputs/saas-platform-structure.tar.gz)

### 方式 2：手動複製

如果自動下載連結無法使用，請：

1. 在 Claude.ai 介面中找到壓縮檔連結
2. 點擊下載按鈕
3. 檔案會下載到你的電腦

## 📂 解壓縮

```bash
# 解壓縮
tar -xzf saas-platform-structure.tar.gz

# 進入目錄
cd saas-platform-structure

# 查看結構
tree -L 2
```

## 🗄️ 資料庫連接資訊

### PostgreSQL (Docker)

```yaml
Host: localhost
Port: 5432
Database: saas_platform
Username: postgres
Password: postgres
```

### 連接字串

```
postgresql://postgres:postgres@localhost:5432/saas_platform
```

### psql 命令

```bash
# 連接到 PostgreSQL
docker exec -it postgres-crypto psql -U postgres -d saas_platform

# 或從本地連接
psql -h localhost -p 5432 -U postgres -d saas_platform
```

## 📋 專案包含內容

### 1. Apps（應用程式）✅

```
apps/
├── platform-api/          ✅ 已創建基本結構
│   ├── package.json
│   ├── mikro-orm.config.ts
│   ├── .env
│   └── src/
├── tenant-api/            ✅ 已創建基本結構
├── platform-admin/        ✅ 已創建基本結構
├── tenant-admin/          ✅ 已創建基本結構
├── agent-portal/          ✅ 已創建基本結構
└── customer-web/          ✅ 已創建基本結構
```

### 2. Packages（共享套件）✅

```
packages/
├── database/              ✅ 完整 Entities
│   └── src/entities/
│       ├── base.entity.ts
│       ├── tenant.entity.ts
│       ├── user.entity.ts
│       ├── agent.entity.ts
│       ├── customer.entity.ts
│       ├── commission-payout.entity.ts
│       ├── revenue-distribution.entity.ts
│       └── system-fee-distribution.entity.ts
├── shared-types/          ✅ 已創建基本結構
├── ui/                    ✅ 已創建基本結構
├── auth/                  ✅ 已創建基本結構
├── utils/                 ✅ 已創建基本結構
├── theme/                 ✅ 已創建基本結構
├── api-client/            ✅ 已創建基本結構
└── config/                ✅ 已創建基本結構
```

### 3. Docs（文檔）✅

```
docs/
├── DATABASE_ER_DIAGRAM.md                      ✅ 完整 ER 圖
├── MULTI_SITE_ARCHITECTURE_FINAL.md           ✅ 多站系統架構
├── COMMISSION_MECHANISM_FINAL.md              ✅ 佣金分潤機制
├── FEE_CALCULATION_COMPARISON.md              ✅ 費率計算對比
├── REVENUE_SHARING_CALCULATION_EXAMPLE.md     ✅ 分潤計算範例
├── ENTITY_CREATION_COMPLETE.md                ✅ Entity 創建總結
├── POSTGRESQL_DOCKER_SETUP.md                 ✅ PostgreSQL 設置
├── MIKROORM_SETUP.md                          ✅ MikroORM 設置
├── AWS_POSTGRESQL_VS_MYSQL.md                 ✅ 資料庫選擇
└── MULTI_TENANT_DATABASE_DECISION.md          ✅ 多租戶架構
```

## 🚀 下載後的第一步

### 1. 解壓縮並安裝

```bash
# 解壓縮
tar -xzf saas-platform-structure.tar.gz
cd saas-platform-structure

# 安裝依賴
pnpm install

# 或
npm install
```

### 2. 啟動 PostgreSQL

```bash
# 啟動 Docker 容器
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  --name postgres-crypto \
  postgres:16-alpine

# 等待啟動
sleep 10

# 創建資料庫
docker exec postgres-crypto \
  psql -U postgres -c "CREATE DATABASE saas_platform;"
```

### 3. 配置環境變數

```bash
# platform-api 已經有 .env 檔案
# 可以直接查看
cat apps/platform-api/.env

# 內容：
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=postgres
# DB_PASSWORD=postgres
# DB_NAME=saas_platform
```

### 4. 執行 Migration

```bash
# 進入 platform-api
cd apps/platform-api

# 生成 migration
npx mikro-orm migration:create --name init-crypto-investment-system

# 執行 migration
npx mikro-orm migration:up

# 確認表已創建
docker exec postgres-crypto \
  psql -U postgres -d saas_platform -c "\dt"
```

## 📊 預期看到的資料表

執行 Migration 後應該會看到：

```
             List of relations
 Schema |          Name           | Type  |  Owner   
--------+-------------------------+-------+----------
 public | agents                  | table | postgres
 public | commission_payouts      | table | postgres
 public | customers               | table | postgres
 public | mikro_orm_migrations    | table | postgres
 public | revenue_distributions   | table | postgres
 public | system_fee_distributions| table | postgres
 public | tenants                 | table | postgres
 public | users                   | table | postgres
```

## 🎯 核心檔案說明

### 資料庫相關

| 檔案 | 說明 |
|------|------|
| `packages/database/src/entities/*.entity.ts` | 所有 Entity 定義 |
| `apps/platform-api/mikro-orm.config.ts` | MikroORM 配置 |
| `apps/platform-api/.env` | 環境變數（含資料庫連接資訊）|

### 文檔相關

| 檔案 | 說明 |
|------|------|
| `docs/DATABASE_ER_DIAGRAM.md` | 完整資料表關聯圖 |
| `docs/REVENUE_SHARING_CALCULATION_EXAMPLE.md` | 分潤計算實際範例 |
| `docs/POSTGRESQL_DOCKER_SETUP.md` | PostgreSQL 設置詳細步驟 |

## ⚠️ 重要提醒

### 資料庫連接資訊

**Docker PostgreSQL 預設帳密**：

```
Username: postgres
Password: postgres
```

這些資訊已經寫在 `apps/platform-api/.env` 檔案中，可以直接使用。

### Migration 位置

執行 `migration:create` 後，migration 檔案會在：

```
apps/platform-api/src/migrations/Migration20241201_*.ts
```

## 🆘 常見問題

### Q1: Docker 找不到 postgres 映像檔

```bash
# 這是正常的，Docker 會自動下載
# 只需等待 1-2 分鐘即可
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  --name postgres-crypto \
  postgres:16-alpine
```

### Q2: 端口 5432 被佔用

```bash
# 查看是否有其他 PostgreSQL 在運行
sudo lsof -i :5432

# 停止其他 PostgreSQL
sudo systemctl stop postgresql

# 或使用不同端口
docker run -d -p 5433:5432 \
  -e POSTGRES_PASSWORD=postgres \
  --name postgres-crypto \
  postgres:16-alpine

# 記得修改 .env 中的 DB_PORT=5433
```

### Q3: Migration 失敗

```bash
# 檢查資料庫是否存在
docker exec postgres-crypto \
  psql -U postgres -c "\l"

# 如果沒有 saas_platform，手動創建
docker exec postgres-crypto \
  psql -U postgres -c "CREATE DATABASE saas_platform;"

# 再次執行 migration
npx mikro-orm migration:up
```

## 📞 技術支援

如遇到問題，請參考：

1. **資料庫設置**：`docs/POSTGRESQL_DOCKER_SETUP.md`
2. **MikroORM 配置**：`docs/MIKROORM_SETUP.md`
3. **分潤機制**：`docs/COMMISSION_MECHANISM_FINAL.md`

---

## ✅ 檢查清單

下載後請確認：

- [ ] 解壓縮成功
- [ ] 看到 `apps/` 和 `packages/` 目錄
- [ ] 看到 `docs/` 目錄（10+ 個 .md 檔案）
- [ ] PostgreSQL 容器運行中
- [ ] 資料庫 `saas_platform` 已創建
- [ ] `.env` 檔案存在
- [ ] Migration 可以執行

---

**祝你開發順利！** 🚀
