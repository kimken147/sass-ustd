#!/bin/bash

# 檢查租戶配置腳本
# 用於確認 TENANT_SLUG 和實際資料庫是否匹配

set -e

echo "========================================"
echo "租戶配置檢查"
echo "========================================"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# PostgreSQL 連接參數
PG_HOST="${PLATFORM_DB_HOST:-localhost}"
PG_PORT="${PLATFORM_DB_PORT:-5432}"
PG_USER="${PLATFORM_DB_USER:-postgres}"
PLATFORM_DB="saas_platform"

echo ""
echo "=== 1. 檢查現有租戶資料庫 ==="
echo ""
psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -t -c "
SELECT 
  datname as database_name,
  CASE 
    WHEN datname LIKE 'tenant_%' THEN SUBSTRING(datname FROM 8)
    ELSE 'N/A'
  END as extracted_slug
FROM pg_database 
WHERE datname LIKE 'tenant%'
ORDER BY datname;
" 2>/dev/null || {
  echo -e "${RED}❌ 無法連接到 PostgreSQL${NC}"
  echo "請確保 PostgreSQL 正在運行"
  exit 1
}

echo ""
echo "=== 2. 檢查 Platform DB 中的租戶記錄 ==="
echo ""
psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PLATFORM_DB" -c "
SELECT 
  id,
  name,
  slug,
  'tenant_' || slug as expected_db_name,
  status
FROM tenants
ORDER BY id;
" 2>/dev/null || {
  echo -e "${YELLOW}⚠️  無法查詢 Platform DB，可能資料庫不存在${NC}"
}

echo ""
echo "=== 3. 檢查 Tenant API .env 配置 ==="
echo ""
if [ -f "apps/tenant-api/.env" ]; then
  TENANT_SLUG=$(grep "^TENANT_SLUG=" apps/tenant-api/.env | cut -d'=' -f2)
  echo "TENANT_SLUG = $TENANT_SLUG"
  echo "預期資料庫名稱 = tenant_${TENANT_SLUG}"
else
  echo -e "${RED}❌ 找不到 apps/tenant-api/.env${NC}"
fi

echo ""
echo "=== 4. 驗證配置是否匹配 ==="
echo ""

# 檢查預期資料庫是否存在
if [ -n "$TENANT_SLUG" ]; then
  EXPECTED_DB="tenant_${TENANT_SLUG}"
  
  DB_EXISTS=$(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres -t -c "
    SELECT COUNT(*) FROM pg_database WHERE datname = '$EXPECTED_DB';
  " 2>/dev/null | tr -d ' ')
  
  if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${GREEN}✅ 資料庫 '$EXPECTED_DB' 存在且與 .env 配置匹配${NC}"
  else
    echo -e "${RED}❌ 資料庫 '$EXPECTED_DB' 不存在${NC}"
    echo -e "${YELLOW}可能的問題：${NC}"
    echo "  1. .env 中的 TENANT_SLUG 與實際創建的租戶不一致"
    echo "  2. 資料庫尚未創建"
    echo ""
    echo -e "${YELLOW}建議操作：${NC}"
    echo "  1. 檢查上方列出的實際資料庫名稱"
    echo "  2. 檢查 Platform DB 中的租戶 slug"
    echo "  3. 更新 .env 中的 TENANT_SLUG 使其與實際租戶一致"
  fi
fi

echo ""
echo "========================================"
echo "檢查完成"
echo "========================================"
