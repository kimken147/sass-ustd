# 檢查租戶資料庫配置

## 問題
- `.env` 設定: `TENANT_SLUG=test001`
- 但實際資料庫可能是: `tenant_test_001`

## 檢查步驟

### 1. 檢查實際存在的資料庫
```bash
# 連接 PostgreSQL 並列出所有資料庫
psql -h localhost -U postgres -c "\l" | grep tenant

# 或使用
psql -h localhost -U postgres -d postgres -c "SELECT datname FROM pg_database WHERE datname LIKE 'tenant%';"
```

### 2. 檢查 Platform DB 中的租戶記錄
```bash
# 連接到 platform DB
psql -h localhost -U postgres -d saas_platform

# 查詢租戶
SELECT id, name, slug FROM tenants;
```

### 3. 根據結果調整配置

#### 情況 A：資料庫是 `tenant_test001`
- `.env` 配置正確，無需修改
- 可能只是誤解了資料庫名稱

#### 情況 B：資料庫是 `tenant_test_001`
需要修改 `.env`:
```bash
# 將
TENANT_SLUG=test001

# 改為
TENANT_SLUG=test_001
```

## 快速修復腳本

```bash
#!/bin/bash
# 檢查並修復租戶配置

# 1. 列出所有租戶資料庫
echo "=== 現有租戶資料庫 ==="
psql -h localhost -U postgres -d postgres -c "SELECT datname FROM pg_database WHERE datname LIKE 'tenant%';"

# 2. 列出所有租戶記錄
echo -e "\n=== Platform DB 中的租戶 ==="
psql -h localhost -U postgres -d saas_platform -c "SELECT id, name, slug FROM tenants;"

# 3. 檢查當前 .env 配置
echo -e "\n=== 當前 .env 配置 ==="
grep TENANT_SLUG apps/tenant-api/.env
```

## 建議

1. **統一命名規範**：
   - 租戶 slug 建議使用：`test001`（不使用底線）
   - 資料庫名稱自動生成：`tenant_test001`

2. **如果需要使用底線**：
   - 租戶 slug：`test_001`
   - 資料庫名稱：`tenant_test_001`

3. **確保一致性**：
   - Platform DB 中的 `tenants.slug` 
   - Tenant API 的 `TENANT_SLUG`
   - 實際資料庫名稱 `tenant_{slug}`
   
這三者必須保持一致！
