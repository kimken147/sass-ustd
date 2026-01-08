# PostgreSQL Docker 設置指南

## 🐳 問題說明

錯誤訊息：`Unable to find image 'postgres:16-alpine' locally`

**這是正常的！** Docker 正在從 Docker Hub 下載映像檔。

---

## ✅ 解決方案

### 方法 1：等待下載完成（推薦）

```bash
# 第一次執行時 Docker 會自動下載映像檔
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  --name postgres-crypto \
  postgres:16-alpine

# 你會看到類似這樣的輸出：
# Unable to find image 'postgres:16-alpine' locally
# 16-alpine: Pulling from library/postgres
# f56be85fc22e: Pull complete
# ...
# Status: Downloaded newer image for postgres:16-alpine
# [container-id]

# ⏳ 等待下載完成（大約 1-2 分鐘）
```

### 方法 2：先手動下載

```bash
# 1. 先下載映像檔
docker pull postgres:16-alpine

# 你會看到下載進度：
# 16-alpine: Pulling from library/postgres
# f56be85fc22e: Downloading [========>                  ] 1.2MB/7.5MB
# ...

# 2. 下載完成後，再執行容器
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  --name postgres-crypto \
  postgres:16-alpine
```

---

## 📝 完整設置步驟

### 步驟 1：啟動 PostgreSQL

```bash
# 啟動 PostgreSQL 容器
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  --name postgres-crypto \
  postgres:16-alpine

# 等待容器啟動（約 5-10 秒）
sleep 10
```

### 步驟 2：確認容器運行

```bash
# 檢查容器狀態
docker ps

# 應該看到：
# CONTAINER ID   IMAGE                 STATUS         PORTS
# xxxxxxxxxxxx   postgres:16-alpine    Up 10 seconds  0.0.0.0:5432->5432/tcp

# 檢查日誌
docker logs postgres-crypto

# 應該看到：
# ... database system is ready to accept connections
```

### 步驟 3：創建資料庫

```bash
# 創建 saas_platform 資料庫
docker exec postgres-crypto \
  psql -U postgres -c "CREATE DATABASE saas_platform;"

# 應該看到：
# CREATE DATABASE

# 驗證資料庫已創建
docker exec postgres-crypto \
  psql -U postgres -c "\l"

# 應該看到 saas_platform 在列表中
```

### 步驟 4：測試連接

```bash
# 測試連接
docker exec -it postgres-crypto \
  psql -U postgres -d saas_platform

# 進入 psql 後執行：
# saas_platform=# \dt
# (應該是空的，因為還沒執行 migration)

# 退出 psql
# saas_platform=# \q
```

---

## 🔧 常見問題處理

### 問題 1：下載很慢

```bash
# 如果下載太慢，可以使用國內鏡像
# 編輯 Docker 配置（僅限中國大陸）
sudo nano /etc/docker/daemon.json

# 添加：
{
  "registry-mirrors": [
    "https://mirror.gcr.io",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}

# 重啟 Docker
sudo systemctl restart docker

# 重新下載
docker pull postgres:16-alpine
```

### 問題 2：端口被佔用

```bash
# 錯誤：Bind for 0.0.0.0:5432 failed: port is already allocated

# 解決方案 A：停止現有的 PostgreSQL
sudo systemctl stop postgresql

# 解決方案 B：使用不同端口
docker run -d -p 5433:5432 \
  -e POSTGRES_PASSWORD=postgres \
  --name postgres-crypto \
  postgres:16-alpine

# 記得修改連接字串為 localhost:5433
```

### 問題 3：容器名稱衝突

```bash
# 錯誤：The container name "/postgres-crypto" is already in use

# 解決方案 A：刪除舊容器
docker rm -f postgres-crypto

# 然後重新執行
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  --name postgres-crypto \
  postgres:16-alpine

# 解決方案 B：使用不同名稱
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  --name postgres-crypto-new \
  postgres:16-alpine
```

### 問題 4：容器無法啟動

```bash
# 查看詳細錯誤
docker logs postgres-crypto

# 如果看到 "database files are incompatible"
# 需要刪除舊的數據卷
docker rm -f postgres-crypto
docker volume prune -f

# 重新啟動
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  --name postgres-crypto \
  postgres:16-alpine
```

---

## 📦 進階配置（可選）

### 配置 1：持久化數據

```bash
# 創建本地目錄
mkdir -p ~/postgres-data

# 使用數據卷
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -v ~/postgres-data:/var/lib/postgresql/data \
  --name postgres-crypto \
  postgres:16-alpine

# 好處：
# ✅ 容器刪除後數據不丟失
# ✅ 可以備份整個目錄
```

### 配置 2：自訂配置檔

```bash
# 創建配置目錄
mkdir -p ~/postgres-config

# 創建配置檔
cat > ~/postgres-config/postgresql.conf << 'EOF'
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB
EOF

# 使用自訂配置
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -v ~/postgres-config/postgresql.conf:/etc/postgresql/postgresql.conf \
  --name postgres-crypto \
  postgres:16-alpine \
  -c config_file=/etc/postgresql/postgresql.conf
```

### 配置 3：多個資料庫

```bash
# 啟動容器後創建多個資料庫
docker exec postgres-crypto \
  psql -U postgres -c "CREATE DATABASE saas_platform;"

docker exec postgres-crypto \
  psql -U postgres -c "CREATE DATABASE saas_platform_test;"

docker exec postgres-crypto \
  psql -U postgres -c "CREATE DATABASE saas_platform_dev;"
```

---

## 🎯 完整一鍵設置腳本

```bash
#!/bin/bash

echo "🚀 開始設置 PostgreSQL..."

# 1. 停止並刪除舊容器（如果存在）
docker rm -f postgres-crypto 2>/dev/null || true

# 2. 下載映像檔
echo "📦 下載 PostgreSQL 映像檔..."
docker pull postgres:16-alpine

# 3. 啟動容器
echo "🐳 啟動 PostgreSQL 容器..."
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  --name postgres-crypto \
  postgres:16-alpine

# 4. 等待容器啟動
echo "⏳ 等待 PostgreSQL 啟動..."
sleep 10

# 5. 檢查狀態
echo "✅ 檢查容器狀態..."
docker ps | grep postgres-crypto

# 6. 創建資料庫
echo "📊 創建資料庫..."
docker exec postgres-crypto \
  psql -U postgres -c "CREATE DATABASE saas_platform;"

# 7. 驗證
echo "🔍 驗證資料庫..."
docker exec postgres-crypto \
  psql -U postgres -c "\l" | grep saas_platform

echo "🎉 PostgreSQL 設置完成！"
echo ""
echo "連接資訊："
echo "  Host: localhost"
echo "  Port: 5432"
echo "  User: postgres"
echo "  Password: postgres"
echo "  Database: saas_platform"
echo ""
echo "測試連接："
echo "  docker exec -it postgres-crypto psql -U postgres -d saas_platform"
```

### 使用方式

```bash
# 1. 保存腳本
nano setup-postgres.sh

# 2. 賦予執行權限
chmod +x setup-postgres.sh

# 3. 執行
./setup-postgres.sh
```

---

## 🔗 連接字串

### NestJS / MikroORM

```typescript
// apps/platform-api/src/mikro-orm.config.ts
export default defineConfig({
  driver: PostgreSqlDriver,
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  dbName: 'saas_platform',
  // ...
});
```

### 環境變數

```bash
# .env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=saas_platform
```

---

## 📝 常用命令

```bash
# 啟動容器
docker start postgres-crypto

# 停止容器
docker stop postgres-crypto

# 重啟容器
docker restart postgres-crypto

# 刪除容器
docker rm -f postgres-crypto

# 查看日誌
docker logs postgres-crypto
docker logs -f postgres-crypto  # 持續查看

# 進入容器
docker exec -it postgres-crypto bash

# 連接 PostgreSQL
docker exec -it postgres-crypto psql -U postgres -d saas_platform

# 備份資料庫
docker exec postgres-crypto \
  pg_dump -U postgres saas_platform > backup.sql

# 還原資料庫
docker exec -i postgres-crypto \
  psql -U postgres saas_platform < backup.sql
```

---

## ✅ 下一步

PostgreSQL 設置完成後，可以繼續：

```bash
# 1. 進入專案目錄
cd /path/to/saas-platform-structure/apps/platform-api

# 2. 生成 Migration
npx mikro-orm migration:create --name init-crypto-investment-system

# 3. 執行 Migration
npx mikro-orm migration:up

# 4. 確認表已創建
docker exec postgres-crypto \
  psql -U postgres -d saas_platform -c "\dt"
```

---

## 🎉 完成！

如果看到 `Unable to find image 'postgres:16-alpine' locally`：
- ✅ 這是正常的
- ⏳ 等待下載完成（1-2 分鐘）
- 🎊 下載後會自動啟動容器

**祝你順利！** 🚀
