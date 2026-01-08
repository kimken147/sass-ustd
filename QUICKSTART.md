# 🚀 快速開始指南

## 📥 立即下載

### 專案壓縮檔

**檔案大小**：80 KB  
**包含檔案**：52 個檔案（含完整 Entity + 詳細文檔）

👉 **[點擊下載完整專案](computer:///mnt/user-data/outputs/saas-platform-structure.tar.gz)**

---

## 🔑 資料庫連接資訊（重要！）

### PostgreSQL Docker 預設帳密

```yaml
Host: localhost
Port: 5432
Database: saas_platform
Username: postgres  ← 這個
Password: postgres  ← 這個
```

### 連接字串

```
postgresql://postgres:postgres@localhost:5432/saas_platform
```

---

## ⚡ 3 分鐘快速啟動

### 1. 下載並解壓縮

```bash
# 下載後解壓縮
tar -xzf saas-platform-structure.tar.gz
cd saas-platform-structure
```

### 2. 啟動資料庫

```bash
# 啟動 PostgreSQL（第一次會下載映像檔，需等待 1-2 分鐘）
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  --name postgres-crypto \
  postgres:16-alpine

# 等待 10 秒
sleep 10

# 創建資料庫
docker exec postgres-crypto \
  psql -U postgres -c "CREATE DATABASE saas_platform;"
```

### 3. 驗證連接

```bash
# 測試連接（帳號：postgres，密碼：postgres）
docker exec -it postgres-crypto psql -U postgres -d saas_platform

# 成功後會看到：
# saas_platform=#

# 輸入 \q 退出
```

---

## 📂 專案內容

### ✅ 已包含

```
✅ 8 個 Entity 檔案（完整）
✅ MikroORM 配置
✅ 環境變數設定（.env）
✅ 11 個詳細文檔
✅ 6 個 Apps 基本結構
✅ 8 個 Packages 基本結構
```

### 📄 核心檔案位置

```
packages/database/src/entities/
  ├── tenant.entity.ts           ← 租戶（含分潤錢包）
  ├── user.entity.ts             ← 用戶（統一認證）
  ├── agent.entity.ts            ← 代理商（無限層級）
  ├── customer.entity.ts         ← 投資客戶
  ├── commission-payout.entity.ts      ← 代理佣金記錄
  ├── revenue-distribution.entity.ts   ← 租戶分潤記錄
  └── system-fee-distribution.entity.ts ← 系統費記錄

apps/platform-api/
  ├── .env                       ← 資料庫連接設定
  └── mikro-orm.config.ts        ← MikroORM 配置

docs/
  ├── DATABASE_ER_DIAGRAM.md              ← 完整 ER 圖
  ├── REVENUE_SHARING_CALCULATION_EXAMPLE.md ← 分潤範例
  └── POSTGRESQL_DOCKER_SETUP.md          ← 資料庫設置
```

---

## 🎯 下一步（執行 Migration）

```bash
# 1. 安裝依賴（如果需要）
pnpm install  # 或 npm install

# 2. 進入 platform-api
cd apps/platform-api

# 3. 生成 migration
npx mikro-orm migration:create --name init-crypto-investment-system

# 4. 執行 migration
npx mikro-orm migration:up

# 5. 確認表已創建
docker exec postgres-crypto \
  psql -U postgres -d saas_platform -c "\dt"
```

### 預期結果

```
             List of relations
 Schema |          Name           | Type  
--------+-------------------------+-------
 public | agents                  | table
 public | commission_payouts      | table
 public | customers               | table
 public | revenue_distributions   | table
 public | system_fee_distributions| table
 public | tenants                 | table
 public | users                   | table
```

---

## 📚 詳細文檔

| 文檔 | 說明 |
|------|------|
| `DOWNLOAD_GUIDE.md` | 完整下載和設置指南 |
| `docs/DATABASE_ER_DIAGRAM.md` | 資料表關聯圖 |
| `docs/REVENUE_SHARING_CALCULATION_EXAMPLE.md` | 分潤計算實例 |
| `docs/POSTGRESQL_DOCKER_SETUP.md` | PostgreSQL 詳細設置 |

---

## ⚠️ 常見問題快速解答

### Q: Docker 顯示 "Unable to find image"？

**A:** 這是正常的！Docker 正在下載映像檔，等待 1-2 分鐘即可。

### Q: 資料庫帳號密碼是什麼？

**A:** 
- **帳號**：`postgres`
- **密碼**：`postgres`
- 已寫在 `apps/platform-api/.env` 檔案中

### Q: 如何查看 .env 內容？

```bash
cat apps/platform-api/.env

# 會看到：
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=postgres
# DB_PASSWORD=postgres
# DB_NAME=saas_platform
```

---

## 🎊 開始開發

一切設置完成後：

```bash
# 啟動開發伺服器
pnpm dev

# 或只啟動 platform-api
pnpm dev --filter @saas-platform/platform-api
```

---

**祝你開發順利！** 🚀

有問題請參考 `DOWNLOAD_GUIDE.md` 或各個文檔。
