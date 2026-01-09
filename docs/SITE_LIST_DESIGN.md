# 站點列表功能設計方案

## 📋 需求概述

系統商後台需要展示所有站點（租戶）的列表，每個站點包含：
- 站點基本信息（名稱、域名、費率等）
- 授權錢包信息
- 系統費錢包配置
- 站點獨立統計數據（授權客戶、總數量、收割數量、利潤、商戶代理、系統費用）
- 總體統計數據（所有站點的匯總）

**核心挑戰**：每個站點都有獨立的資料庫（`tenant_{slug}`），需要跨資料庫聚合統計數據。

## 🏗️ 架構設計

### 系統錢包分類

系統錢包（SystemWallet）分為兩種類型：

1. **授權錢包（CONTRACT_EXECUTION）**
   - **用途**：執行合約操作的錢包（用於客戶授權合約）
   - **來源**：從 `system_wallets` 表查詢，類型為 `CONTRACT_EXECUTION`，狀態為 `ACTIVE`
   - **顯示位置**：站點列表中的 `authorizationWallet` 字段
   - **特點**：全局共用，所有站點使用同一個授權錢包

2. **系統費錢包（REVENUE_DISTRIBUTION）**
   - **用途**：接收系統費用的分潤錢包
   - **來源**：從租戶的 `systemWallets` 字段獲取（已指派給租戶的系統錢包）
   - **顯示位置**：站點列表中的 `systemFeeWallets` 數組
   - **特點**：每個站點可以有多個系統費錢包，按比例分配

### 設計方案：混合方案（實時查詢 + 可選緩存）

#### 方案選擇理由

1. **實時查詢**：
   - ✅ 數據最新，無需等待緩存更新
   - ✅ 實現簡單，無需額外的緩存同步邏輯
   - ⚠️ 性能取決於租戶數量（並行查詢可緩解）

2. **可選緩存層**（未來優化）：
   - 使用 Redis 緩存統計結果（TTL: 5 分鐘）
   - 當有新的投資/分潤記錄時，使緩存失效
   - 適合租戶數量較多的場景（> 50 個租戶）

### 模組結構

```
apps/platform-api/src/modules/sites/
├── dto/
│   ├── site-stats.dto.ts              # 統計數據 DTO
│   ├── site-list-query.dto.ts         # 查詢條件 DTO
│   ├── site-item.dto.ts               # 站點列表項 DTO
│   └── site-list-response.dto.ts      # 響應 DTO
├── services/
│   ├── tenant-db-connection.service.ts    # 租戶資料庫連接服務
│   └── site-stats.service.ts              # 統計數據服務
├── sites.service.ts                        # 站點列表主服務
├── sites.controller.ts                     # 控制器
├── sites.module.ts                         # 模組定義
└── README.md                                # 模組文檔
```

### 核心組件

#### 1. TenantDbConnectionService
**職責**：管理動態資料庫連接

**特點**：
- 連接緩存（避免重複創建連接）
- 自動連接管理（模組銷毀時關閉）
- 參數化查詢（防止 SQL 注入）

**實現**：
```typescript
// 獲取連接
async getConnection(tenantSlug: string): Promise<Client>

// 執行查詢
async query<T>(tenantSlug: string, query: string, params?: any[]): Promise<T[]>
```

#### 2. SiteStatsService
**職責**：從各個租戶資料庫中聚合統計數據

**統計數據來源**：

| 統計項 | 來源表 | 欄位/邏輯 |
|--------|--------|-----------|
| 授權客戶數量 | `customers` | `COUNT(*) WHERE wallet->>'isApproved' = 'true'` |
| 總數量（總投資額） | `customers` | `SUM(investment_stats->>'totalInvested')` |
| 收割數量 | `revenue_distributions` 或 `customers` | 根據時間類型選擇 |
| 利潤 | `customers` | `SUM(investment_stats->>'totalProfit')` |
| 商戶代理（代理佣金） | `commission_payouts` | `SUM(amount)` |
| 系統費用 | `system_fee_distributions` | `SUM(amount)` |

**時間條件處理**：
- **授權時間** (`authorization_time`)：使用 `customers.wallet->>'approvedAt'`
- **收割時間** (`harvest_time`)：使用 `revenue_distributions.created_at`、`commission_payouts.created_at` 等

#### 3. SitesService
**職責**：協調站點列表的獲取和聚合

**流程**：
1. 從 Platform DB 獲取所有活躍租戶
2. 從系統錢包表查詢授權錢包（類型為 `CONTRACT_EXECUTION`）
3. 從租戶的 `systemWallets` 字段獲取系統費錢包（類型為 `REVENUE_DISTRIBUTION`）
4. 並行調用 `SiteStatsService` 獲取各站點統計
5. 聚合總體統計數據
6. 構建響應 DTO（包含授權錢包、系統費錢包等信息）

**錢包數據來源**：
- **授權錢包**：`SystemWallet` 表，`type = CONTRACT_EXECUTION`
- **系統費錢包**：`Tenant.systemWallets`（JSON 字段），包含已指派的系統錢包信息

## 📊 數據流程

```
用戶請求 GET /sites?startTime=...&endTime=...
    │
    ▼
SitesController.getSiteList()
    │
    ▼
SitesService.getSiteList()
    │
    ├─► 查詢 Platform DB (tenants 表)
    │   └─► 獲取所有活躍租戶列表
    │
    └─► SiteStatsService.getTotalStats()
            │
            ├─► 並行查詢各租戶資料庫
            │   │
            │   ├─► TenantDbConnectionService.getConnection('tenant_slug1')
            │   │   └─► 執行統計查詢
            │   │
            │   ├─► TenantDbConnectionService.getConnection('tenant_slug2')
            │   │   └─► 執行統計查詢
            │   │
            │   └─► ...
            │
            └─► 聚合所有統計結果
                │
                └─► 返回總體統計 + 各站點統計
```

## 🔍 查詢優化

### 1. 並行查詢
- 各站點的統計查詢並行執行（`Promise.all`）
- 單個站點的多個統計查詢並行執行

### 2. 連接緩存
- 每個租戶的資料庫連接緩存在 `TenantDbConnectionService` 中
- 避免重複創建連接

### 3. 索引優化建議
確保以下欄位有索引：
```sql
-- customers 表
CREATE INDEX idx_customers_wallet_approved_at 
ON customers ((wallet->>'approvedAt'));

CREATE INDEX idx_customers_investment_stats 
ON customers USING GIN (investment_stats);

-- revenue_distributions 表
CREATE INDEX idx_revenue_distributions_created_at 
ON revenue_distributions (created_at);

-- commission_payouts 表
CREATE INDEX idx_commission_payouts_created_at 
ON commission_payouts (created_at);

-- system_fee_distributions 表
CREATE INDEX idx_system_fee_distributions_created_at 
ON system_fee_distributions (created_at);
```

### 4. 未來優化：緩存層
```typescript
// 使用 Redis 緩存統計結果
@Injectable()
export class SiteStatsCacheService {
  async getCachedStats(tenantSlug: string, query: SiteListQueryDto): Promise<SiteStatsDto | null> {
    const key = `site:stats:${tenantSlug}:${JSON.stringify(query)}`;
    return await this.redis.get(key);
  }

  async setCachedStats(tenantSlug: string, query: SiteListQueryDto, stats: SiteStatsDto): Promise<void> {
    const key = `site:stats:${tenantSlug}:${JSON.stringify(query)}`;
    await this.redis.setex(key, 300, JSON.stringify(stats)); // TTL: 5 分鐘
  }

  async invalidateStats(tenantSlug: string): Promise<void> {
    const pattern = `site:stats:${tenantSlug}:*`;
    await this.redis.del(pattern);
  }
}
```

## 🛡️ 錯誤處理

### 1. 資料庫不存在
- 捕獲連接錯誤
- 返回默認統計值（全為 0）
- 記錄錯誤日誌

### 2. 查詢失敗
- 捕獲查詢錯誤
- 返回默認統計值
- 記錄錯誤日誌（包含租戶 slug 和錯誤信息）

### 3. 連接超時
- 由 PostgreSQL 客戶端處理
- 可配置連接超時時間

## 📝 API 文檔

### GET /sites

**查詢參數：**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `startTime` | string (ISO 8601) | 否 | 開始時間 |
| `endTime` | string (ISO 8601) | 否 | 結束時間 |
| `timeType` | enum | 否 | 時間類型：`authorization_time` \| `harvest_time`（默認：`authorization_time`） |
| `authorizationStatus` | enum | 否 | 授權狀態：`all` \| `authorized` \| `unauthorized`（默認：`all`） |
| `page` | number | 否 | 頁碼（默認：1） |
| `limit` | number | 否 | 每頁數量（默認：10） |

**響應結構：**
```typescript
{
  totalStats: SiteStatsDto,      // 總體統計
  sites: SiteItemDto[],           // 站點列表
  total: number,                  // 總數
  page: number,                   // 當前頁碼
  limit: number,                  // 每頁數量
  totalPages: number              // 總頁數
}
```

## ⚠️ 注意事項

### 1. 資料庫連接數限制
- 確保 PostgreSQL 的 `max_connections` 設置足夠大
- 建議：`max_connections >= 租戶數量 * 2 + 平台連接數`

### 2. 查詢性能
- 對於大量租戶（> 100），考慮：
  - 添加緩存層
  - 限制並行查詢數量（使用 `p-limit`）
  - 添加查詢超時

### 3. 資料一致性
- 統計數據是實時查詢的，可能與實際數據有輕微延遲
- 如果需要強一致性，考慮使用事務或讀取副本

### 4. 安全性
- 所有查詢都使用參數化查詢，防止 SQL 注入
- 連接使用只讀權限的資料庫用戶（如果可能）

## 🚀 未來擴展

### 1. 實時統計更新
- 使用消息隊列（如 RabbitMQ）通知統計更新
- 當有新的投資/分潤記錄時，異步更新統計

### 2. 統計數據預計算
- 創建統計匯總表（定期更新）
- 減少實時查詢的負擔

### 3. 分頁優化
- 對於大量站點，考慮使用游標分頁
- 支持按統計數據排序

### 4. 導出功能
- 支持導出站點列表為 Excel/CSV
- 支持導出統計報表

## 📚 相關文檔

- [模組 README](./apps/platform-api/src/modules/sites/README.md)
- [多租戶資料庫架構決策](./MULTI_TENANT_DATABASE_DECISION.md)
- [資料庫 ER 圖](./DATABASE_ER_DIAGRAM.md)
