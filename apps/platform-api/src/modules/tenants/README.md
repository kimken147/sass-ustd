# 租戶管理模組

## 功能概述

本模組提供完整的租戶（站台）管理功能，包括：

- ✅ 創建新租戶（自動創建獨立資料庫）
- ✅ 查詢租戶列表
- ✅ 根據 ID 或 slug 查詢租戶
- ✅ 更新租戶資訊
- ✅ 刪除租戶（軟刪除）
- ✅ 檢查租戶資料庫是否存在

## API 端點

### 1. 創建租戶

```http
POST /api/tenants
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "ABC 投資公司",
  "slug": "abc-investment",
  "email": "contact@abc-investment.com",
  "plan": "trial",
  "status": "active",
  "systemFeeRate": 10.0,
  "cryptoConfig": {
    "supportedChains": ["tron"],
    "supportedTokens": ["USDT", "TRX"],
    "minInvestment": 100,
    "maxInvestment": 100000,
    "tenantRevenueRate": 60.0,
    "agentCommissionRate": 30.0
  }
}
```

**回應**：
```json
{
  "id": 1,
  "name": "ABC 投資公司",
  "slug": "abc-investment",
  "email": "contact@abc-investment.com",
  "plan": "trial",
  "status": "active",
  "systemFeeRate": 10.0,
  "cryptoConfig": { ... },
  "revenueWallets": [],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 2. 查詢所有租戶

```http
GET /api/tenants
Authorization: Bearer {accessToken}
```

### 3. 根據 ID 查詢租戶

```http
GET /api/tenants/:id
Authorization: Bearer {accessToken}
```

### 4. 根據 slug 查詢租戶

```http
GET /api/tenants/slug/:slug
Authorization: Bearer {accessToken}
```

### 5. 更新租戶

```http
PATCH /api/tenants/:id
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "ABC 投資公司（更新）",
  "plan": "pro"
}
```

### 6. 刪除租戶（軟刪除）

```http
DELETE /api/tenants/:id
Authorization: Bearer {accessToken}
```

### 7. 檢查租戶資料庫

```http
GET /api/tenants/:slug/database/check
Authorization: Bearer {accessToken}
```

**回應**：
```json
{
  "exists": true,
  "dbName": "tenant_abc-investment"
}
```

## 創建租戶流程

當創建新租戶時，系統會自動執行以下步驟：

1. **驗證唯一性**
   - 檢查 slug 是否已存在
   - 檢查 email 是否已被使用

2. **創建租戶記錄**
   - 在 Platform DB 的 `tenants` 表中創建記錄
   - 設置預設配置（如果未提供）

3. **創建租戶資料庫**
   - 資料庫名稱格式：`tenant_{slug}`
   - 例如：`tenant_abc-investment`
   - 使用 PostgreSQL 的 `CREATE DATABASE` 命令

4. **錯誤處理**
   - 如果資料庫創建失敗，會自動刪除已創建的租戶記錄
   - 確保數據一致性

## 注意事項

### 資料庫命名規則

- 資料庫名稱：`tenant_{slug}`
- slug 必須符合：`^[a-z0-9-]+$`（小寫字母、數字、連字號）
- 例如：slug `abc-investment` → 資料庫 `tenant_abc-investment`

### 資料庫遷移

創建資料庫後，**不會自動運行遷移**。遷移應該：

1. 在部署 tenant-api 時運行
2. 或通過獨立的 API 端點觸發
3. 或使用部署腳本自動化

### 權限要求

創建資料庫需要 PostgreSQL 超級用戶權限或 `CREATEDB` 權限。

### 環境變數

確保以下環境變數已配置：

```env
PLATFORM_DB_HOST=localhost
PLATFORM_DB_PORT=5432
PLATFORM_DB_USER=postgres
PLATFORM_DB_PASSWORD=postgres
PLATFORM_DB_NAME=saas_platform
```

## 使用範例

### 使用 curl 創建租戶

```bash
# 1. 先登入獲取 Token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  | jq -r '.accessToken')

# 2. 創建租戶
curl -X POST http://localhost:3000/api/tenants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ABC 投資公司",
    "slug": "abc-investment",
    "email": "contact@abc.com",
    "plan": "trial"
  }'
```

### 使用 Swagger

訪問 `http://localhost:3000/api/docs`，在 Swagger UI 中測試 API。

## 後續步驟

創建租戶後，通常需要：

1. **運行資料庫遷移**
   ```bash
   # 設置租戶環境變數
   export TENANT_ID=abc-investment
   export TENANT_DB_NAME=tenant_abc-investment
   
   # 運行遷移
   cd apps/tenant-api
   npx mikro-orm migration:up
   ```

2. **創建初始管理員用戶**
   - 可以通過 tenant-api 的用戶管理 API 創建
   - 或使用 Seeder

3. **配置白標設定**
   - 更新租戶的 `branding` 配置
   - 設置 Logo、顏色等

4. **部署 tenant-api 實例**
   - 根據租戶的部署策略
   - 共享 API 或獨立部署
