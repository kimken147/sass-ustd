# 🚀 本地開發環境設置指南

本指南將幫助你在本地啟動所有服務並連接 Docker 中的資料庫進行測試。

## 📋 前置需求

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker（已安裝並運行）
- PostgreSQL 在 Docker 中運行

## 🔧 步驟 1: 確認 Docker 資料庫運行

首先確認你的 PostgreSQL 容器正在運行：

```bash
# 檢查 Docker 容器狀態
docker ps

# 如果沒有運行，啟動 PostgreSQL 容器
# 假設你的容器名稱是 postgres 或類似名稱
docker start <your-postgres-container-name>

# 或者使用以下命令啟動新的容器
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  --name saas-postgres \
  postgres:16-alpine
```

## 📝 步驟 2: 配置環境變數

### 2.1 創建根目錄環境變數文件

```bash
# 從範例文件複製
cp .env.example .env
```

### 2.2 配置 Platform API 環境變數

```bash
cd apps/platform-api
cp ../.env.example .env
# 根據你的 Docker 資料庫配置編輯 .env
```

### 2.3 配置 Tenant API 環境變數

```bash
cd apps/tenant-api
cp ../.env.example .env
# 根據你的 Docker 資料庫配置編輯 .env
# 重要：設置 TENANT_ID（例如：test_001）
```

## 🗄️ 步驟 3: 創建資料庫

### 3.1 創建平台資料庫

```bash
# 連接到 PostgreSQL
docker exec -it <your-postgres-container> psql -U postgres

# 在 psql 中執行
CREATE DATABASE saas_platform;
\q
```

### 3.2 創建租戶資料庫

```bash
# 連接到 PostgreSQL
docker exec -it <your-postgres-container> psql -U postgres

# 在 psql 中執行（假設 TENANT_ID=test_001）
CREATE DATABASE tenant_test_001;
\q
```

或者使用腳本：

```bash
# 創建租戶資料庫（替換 test_001 為你的 TENANT_ID）
docker exec -it <your-postgres-container> \
  psql -U postgres -c "CREATE DATABASE tenant_test_001;"
```

## 📦 步驟 4: 安裝依賴

```bash
# 在項目根目錄
pnpm install
```

## 🔄 步驟 5: 運行資料庫遷移

### 5.1 Platform API 遷移

```bash
cd apps/platform-api
pnpm migration:up
```

### 5.2 Tenant API 遷移

```bash
cd apps/tenant-api
pnpm migration:up
```

## 🚀 步驟 6: 啟動所有服務

### 方式 1: 使用 Turbo 同時啟動所有服務

```bash
# 在項目根目錄
pnpm dev
```

這會同時啟動：
- Platform API (http://localhost:3000)
- Tenant API (http://localhost:3001)
- Platform Admin (http://localhost:5173)
- Tenant Admin (http://localhost:5174)
- Agent Portal (http://localhost:5175)

### 方式 2: 分別啟動服務

#### 啟動後端 API

```bash
# 終端 1: Platform API
cd apps/platform-api
pnpm dev

# 終端 2: Tenant API
cd apps/tenant-api
pnpm dev
```

#### 啟動前端應用

```bash
# 終端 3: Platform Admin
cd apps/platform-admin
pnpm dev

# 終端 4: Tenant Admin
cd apps/tenant-admin
pnpm dev

# 終端 5: Agent Portal
cd apps/agent-portal
pnpm dev
```

## 📊 服務端口一覽表

| 服務 | 端口 | URL |
|------|------|-----|
| Platform API | 3000 | http://localhost:3000 |
| Tenant API | 3001 | http://localhost:3001 |
| Platform Admin | 5173 | http://localhost:5173 |
| Tenant Admin | 5174 | http://localhost:5174 |
| Agent Portal | 5175 | http://localhost:5175 |

## 🔍 驗證服務運行

### 檢查 API 服務

```bash
# Platform API
curl http://localhost:3000/api/docs

# Tenant API
curl http://localhost:3001/api/docs
```

### 檢查資料庫連接

```bash
# 連接到平台資料庫
docker exec -it <your-postgres-container> \
  psql -U postgres -d saas_platform -c "\dt"

# 連接到租戶資料庫
docker exec -it <your-postgres-container> \
  psql -U postgres -d tenant_test_001 -c "\dt"
```

## 🐛 常見問題

### 問題 1: 資料庫連接失敗

**錯誤訊息**: `ECONNREFUSED` 或 `Connection refused`

**解決方案**:
1. 確認 Docker 容器正在運行：`docker ps`
2. 確認端口 5432 沒有被其他程序占用
3. 檢查環境變數中的資料庫配置是否正確

### 問題 2: 資料庫不存在

**錯誤訊息**: `database "saas_platform" does not exist`

**解決方案**:
```bash
# 創建資料庫
docker exec -it <your-postgres-container> \
  psql -U postgres -c "CREATE DATABASE saas_platform;"
```

### 問題 3: 端口已被占用

**錯誤訊息**: `Port 3000 is already in use`

**解決方案**:
1. 找到占用端口的進程：`lsof -i :3000`
2. 終止該進程或修改環境變數中的端口配置

### 問題 4: Tenant API 無法連接資料庫

**錯誤訊息**: `database "tenant_xxx" does not exist`

**解決方案**:
1. 確認 `.env` 文件中設置了 `TENANT_ID`
2. 創建對應的租戶資料庫：`CREATE DATABASE tenant_<TENANT_ID>;`

## 📚 下一步

- 查看 [API 文檔](./API.md) 了解 API 接口
- 查看 [架構設計](../ARCHITECTURE.md) 了解系統架構
- 查看 [開發指南](./DEVELOPMENT.md) 了解開發流程

## 💡 提示

- 使用 `pnpm dev` 可以同時啟動所有服務，適合快速開發
- 使用單獨終端啟動服務可以更清楚地看到每個服務的日誌
- 建議使用 [Docker Compose](../docker-compose.yml) 來管理資料庫和 Redis（如果需要的話）
