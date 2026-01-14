#!/bin/bash

# ============================================
# 本地開發環境設置腳本
# ============================================

set -e

echo "🚀 開始設置本地開發環境..."

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 檢查 Docker 是否運行
echo -e "${YELLOW}檢查 Docker 狀態...${NC}"
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker 未運行，請先啟動 Docker${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker 正在運行${NC}"

# 檢查 PostgreSQL 容器
echo -e "${YELLOW}檢查 PostgreSQL 容器...${NC}"
POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i postgres | head -n 1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo -e "${YELLOW}⚠️  未找到 PostgreSQL 容器，嘗試啟動默認容器...${NC}"
    docker run -d -p 5432:5432 \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_USER=postgres \
      --name saas-postgres \
      postgres:16-alpine || true
    sleep 5
    POSTGRES_CONTAINER="saas-postgres"
fi

echo -e "${GREEN}✅ PostgreSQL 容器: ${POSTGRES_CONTAINER}${NC}"

# 創建資料庫
echo -e "${YELLOW}創建資料庫...${NC}"

# 創建平台資料庫
docker exec -i "$POSTGRES_CONTAINER" psql -U postgres <<EOF
SELECT 'CREATE DATABASE saas_platform'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'saas_platform')\gexec
EOF

# 創建租戶資料庫（默認 test_001）
docker exec -i "$POSTGRES_CONTAINER" psql -U postgres <<EOF
SELECT 'CREATE DATABASE tenant_test_001'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'tenant_test_001')\gexec
EOF

echo -e "${GREEN}✅ 資料庫創建完成${NC}"

# 檢查環境變數文件
echo -e "${YELLOW}檢查環境變數文件...${NC}"

if [ ! -f "apps/platform-api/.env" ]; then
    echo -e "${YELLOW}創建 apps/platform-api/.env...${NC}"
    cat > apps/platform-api/.env <<ENV
PLATFORM_DB_HOST=localhost
PLATFORM_DB_PORT=5432
PLATFORM_DB_USER=postgres
PLATFORM_DB_PASSWORD=postgres
PLATFORM_DB_NAME=saas_platform
PLATFORM_API_PORT=3000
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
NODE_ENV=development
ENV
    echo -e "${GREEN}✅ 已創建 apps/platform-api/.env${NC}"
else
    echo -e "${GREEN}✅ apps/platform-api/.env 已存在${NC}"
fi

if [ ! -f "apps/tenant-api/.env" ]; then
    echo -e "${YELLOW}創建 apps/tenant-api/.env...${NC}"
    cat > apps/tenant-api/.env <<ENV
TENANT_ID=test_001
TENANT_DB_HOST=localhost
TENANT_DB_PORT=5432
TENANT_DB_USER=postgres
TENANT_DB_PASSWORD=postgres
TENANT_DB_NAME=tenant
TENANT_API_PORT=3001
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
NODE_ENV=development
ENV
    echo -e "${GREEN}✅ 已創建 apps/tenant-api/.env${NC}"
else
    echo -e "${GREEN}✅ apps/tenant-api/.env 已存在${NC}"
fi

echo ""
echo -e "${GREEN}🎉 本地開發環境設置完成！${NC}"
echo ""
echo "下一步："
echo "1. 運行資料庫遷移:"
echo "   cd apps/platform-api && pnpm migration:up"
echo "   cd apps/tenant-api && pnpm migration:up"
echo ""
echo "2. 啟動所有服務:"
echo "   pnpm dev"
echo ""
