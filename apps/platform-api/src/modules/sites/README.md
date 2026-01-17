# 站點列表模組

## 概述

站點列表模組用於系統商後台展示所有站點（租戶）的列表及其統計數據。由於每個站點都有獨立的資料庫，該模組實現了跨資料庫的統計數據聚合功能。

## 架構設計

### 系統錢包分類

系統錢包（SystemWallet）分為兩種類型：

1. **授權錢包（CONTRACT_EXECUTION）**
   - 用途：執行合約操作的錢包
   - 來源：從 `system_wallets` 表查詢，類型為 `CONTRACT_EXECUTION`
   - 顯示：在站點列表中顯示為 `authorizationWallet`

2. **系統費錢包（REVENUE_DISTRIBUTION）**
   - 用途：接收系統費用的分潤錢包
   - 來源：從租戶的 `systemWallets` 字段獲取（已指派給租戶的系統錢包）
   - 顯示：在站點列表中顯示為 `systemFeeWallets` 數組

### 核心組件

1. **SitesService** - 站點列表主服務
   - 從 Platform DB 獲取所有租戶信息
   - 從系統錢包表查詢授權錢包（CONTRACT_EXECUTION 類型）
   - 從租戶的 systemWallets 獲取系統費錢包（REVENUE_DISTRIBUTION 類型）
   - 調用 SiteStatsService 獲取各站點統計數據
   - 聚合總體統計數據

2. **SiteStatsService** - 統計數據服務
   - 動態連接到各個租戶資料庫
   - 執行統計查詢
   - 聚合跨資料庫的統計數據

3. **TenantDbConnectionService** - 租戶資料庫連接服務
   - 管理動態資料庫連接
   - 連接緩存和生命周期管理
   - 提供查詢接口

### 數據流程

```
Platform API Request
    │
    ▼
SitesController
    │
    ▼
SitesService
    │
    ├─► 從 Platform DB 獲取所有租戶
    │
    └─► SiteStatsService
            │
            ├─► TenantDbConnectionService
            │       │
            │       └─► 連接 tenant_{slug} 資料庫
            │
            └─► 執行統計查詢
                    │
                    ├─► customers 表（授權客戶、投資統計）
                    ├─► commission_payouts 表（代理佣金）
                    └─► system_fee_distributions 表（系統費用）
```

## API 端點

### GET /sites

獲取站點列表（包含統計數據）

**查詢參數：**
- `startTime` (可選) - 開始時間（ISO 8601 格式）
- `endTime` (可選) - 結束時間（ISO 8601 格式）
- `timeType` (可選) - 時間類型：`authorization_time` | `harvest_time`（默認：`authorization_time`）
- `authorizationStatus` (可選) - 授權狀態：`all` | `authorized` | `unauthorized`（默認：`all`）
- `page` (可選) - 頁碼（默認：1）
- `limit` (可選) - 每頁數量（默認：10）

**響應示例：**
```json
{
  "totalStats": {
    "authorizedClients": 50,
    "totalQuantity": 20000.0,
    "harvestQuantity": 100000.0,
    "profit": 70000.0,
    "merchantAgent": 20000.0,
    "systemFee": 10000.0
  },
  "sites": [
    {
      "id": 1,
      "name": "各站名稱1XXX",
      "slug": "site-1",
      "customDomain": "api.test.com",
      "siteRate": 10,
      "authorizationWallet": {
        "label": "授權用1",
        "address": "TKd7786zhEd65as5JD68s3dH8f5dD"
      },
      "systemFeeWallets": [
        {
          "label": "收系統費用1",
          "address": "TKd7786zhEd65as5JD68s3dH8f5dD",
          "percentage": 100
        }
      ],
      "stats": {
        "authorizedClients": 5,
        "totalQuantity": 2000.0,
        "harvestQuantity": 10000.0,
        "profit": 7000.0,
        "merchantAgent": 2000.0,
        "systemFee": 1000.0
      }
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

## 統計數據來源

### 1. 授權客戶數量
- **來源表**：`customers`
- **條件**：`wallet->>'isApproved' = 'true'`
- **時間欄位**：`wallet->>'approvedAt'`（當 timeType = authorization_time）

### 2. 總數量（總投資額）
- **來源表**：`customers`
- **欄位**：`investment_stats->>'totalInvested'`
- **聚合**：SUM

### 3. 提幣數量
- **來源表**：
  - 當 timeType = `harvest_time`：`revenue_distributions`（`total_amount`）
  - 當 timeType = `authorization_time`：`customers`（`investment_stats->>'totalWithdrawn'`）

### 4. 利潤
- **來源表**：`customers`
- **欄位**：`investment_stats->>'totalProfit'`
- **聚合**：SUM

### 5. 商戶代理（代理佣金總額）
- **來源表**：`commission_payouts`
- **欄位**：`amount`
- **聚合**：SUM

### 6. 系統費用
- **來源表**：`system_fee_distributions`
- **欄位**：`amount`
- **聚合**：SUM

## 性能優化建議

### 1. 連接緩存
- `TenantDbConnectionService` 已實現連接緩存
- 連接在模組銷毀時自動關閉

### 2. 並行查詢
- 各站點的統計查詢並行執行
- 單個站點的多個統計查詢並行執行

### 3. 可選緩存層（未來優化）
考慮添加 Redis 緩存層：
- 緩存總體統計數據（TTL: 5 分鐘）
- 緩存各站點統計數據（TTL: 5 分鐘）
- 當有新的投資/分潤記錄時，使緩存失效

### 4. 資料庫索引優化
確保以下欄位有索引：
- `customers.wallet->>'approvedAt'`
- `customers.investment_stats->>'totalInvested'`
- `revenue_distributions.created_at`
- `commission_payouts.created_at`
- `system_fee_distributions.created_at`

## 錯誤處理

- 如果租戶資料庫不存在，返回默認統計值（全為 0）
- 如果查詢失敗，記錄錯誤日誌並返回默認值
- 連接失敗時自動重試（由 pg 客戶端處理）

## 注意事項

1. **資料庫連接數限制**：確保 PostgreSQL 的 `max_connections` 設置足夠大，以支持並行查詢多個租戶資料庫

2. **查詢超時**：對於大量租戶的情況，考慮添加查詢超時設置

3. **資料一致性**：統計數據是實時查詢的，可能與實際數據有輕微延遲

4. **安全性**：所有查詢都使用參數化查詢，防止 SQL 注入
