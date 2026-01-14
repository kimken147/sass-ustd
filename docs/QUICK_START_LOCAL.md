# ⚡ 本地開發快速啟動指南

## 🎯 快速開始（3 步驟）

### 1. 自動設置環境

```bash
# 運行自動設置腳本（會創建資料庫和環境變數文件）
pnpm setup:local
```

### 2. 運行資料庫遷移

```bash
# 平台資料庫遷移
pnpm migration:platform

# 租戶資料庫遷移
pnpm migration:tenant
```

### 3. 啟動所有服務

```bash
# 啟動所有服務（API + 前端）
pnpm dev
```

## 📍 服務訪問地址

啟動後，你可以訪問以下服務：

- **Platform API**: http://localhost:3000/api/docs (Swagger)
- **Tenant API**: http://localhost:3001/api/docs (Swagger)
- **Platform Admin**: http://localhost:5173
- **Tenant Admin**: http://localhost:5174
- **Agent Portal**: http://localhost:5175

## 🔧 手動設置（如果自動腳本失敗）

### 步驟 1: 確認 Docker 資料庫運行

```bash
docker ps | grep postgres
```

### 步驟 2: 創建資料庫

```bash
# 替換 <container-name> 為你的 PostgreSQL 容器名稱
docker exec -it <container-name> psql -U postgres -c "CREATE DATABASE saas_platform;"
docker exec -it <container-name> psql -U postgres -c "CREATE DATABASE tenant_test_001;"
```

### 步驟 3: 創建環境變數文件

**apps/platform-api/.env**:
```env
PLATFORM_DB_HOST=localhost
PLATFORM_DB_PORT=5432
PLATFORM_DB_USER=postgres
PLATFORM_DB_PASSWORD=postgres
PLATFORM_DB_NAME=saas_platform
PLATFORM_API_PORT=3000
JWT_SECRET=dev-secret-key
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
NODE_ENV=development
```

**apps/tenant-api/.env**:
```env
TENANT_ID=test_001
TENANT_DB_HOST=localhost
TENANT_DB_PORT=5432
TENANT_DB_USER=postgres
TENANT_DB_PASSWORD=postgres
TENANT_DB_NAME=tenant
TENANT_API_PORT=3001
JWT_SECRET=dev-secret-key
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
NODE_ENV=development
```

## 🚀 常用命令

```bash
# 啟動所有服務
pnpm dev

# 只啟動 API 服務
pnpm dev:api

# 只啟動前端服務
pnpm dev:web

# 運行平台資料庫遷移
pnpm migration:platform

# 運行租戶資料庫遷移
pnpm migration:tenant
```

## 🐛 問題排查

### 資料庫連接失敗

1. 確認 Docker 容器運行：`docker ps`
2. 確認端口 5432 可用：`lsof -i :5432`
3. 檢查環境變數配置

### 端口被占用

修改對應服務的 `.env` 文件中的端口配置，或終止占用端口的進程。

### 資料庫不存在

運行資料庫創建命令（見上方手動設置步驟 2）。

## 📚 詳細文檔

查看 [本地開發環境設置指南](./LOCAL_DEVELOPMENT_SETUP.md) 獲取更詳細的說明。
