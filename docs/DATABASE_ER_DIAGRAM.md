# DeFi 投資系統資料庫 ER 圖

## 🎯 系統架構總覽

```
┌─────────────────────────────────────────────────────────────────┐
│                        Platform Level                            │
│  ┌──────────────┐                                               │
│  │   Platform   │  (平台層 - 無租戶隔離)                         │
│  │    Admin     │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Tenant Level                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      Tenant (租戶)                        │   │
│  │  • revenueWallets[] (分潤錢包組 - 可動態調整)            │   │
│  │  • cryptoConfig (投資合約配置)                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Admin     │  │    Agent     │  │   Customer   │         │
│  │   (管理員)    │  │   (代理商)    │  │  (投資客戶)  │         │
│  └──────────────┘  │ • wallet     │  │ • wallet     │         │
│                    │ • commission │  │ • approved   │         │
│                    └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 詳細 ER 圖

### 核心關聯

```
                    ┌─────────────────────────────────────┐
                    │           Tenant                     │
                    │  PK: id                              │
                    │  ────────────────────────────────── │
                    │  name                                │
                    │  slug (unique)                       │
                    │  email (unique)                      │
                    │  status                              │
                    │  plan                                │
                    │  revenueWallets (JSON) 🔑            │
                    │    [{                                │
                    │      id, name, address,              │
                    │      percentage, isActive            │
                    │    }]                                │
                    │  cryptoConfig (JSON)                 │
                    │    {                                 │
                    │      contractAddress,                │
                    │      platformFeeRate                 │
                    │    }                                 │
                    └──────────────┬──────────────────────┘
                                   │
                                   │ 1:N
                                   │
                    ┌──────────────▼──────────────────────┐
                    │           User                       │
                    │  PK: id                              │
                    │  FK: tenant_id (nullable)            │
                    │  ────────────────────────────────── │
                    │  email (unique per tenant)           │
                    │  password (hashed)                   │
                    │  name                                │
                    │  role (enum) 🔑                      │
                    │    - platform_admin                  │
                    │    - tenant_admin                    │
                    │    - agent                           │
                    │    - customer                        │
                    │  status                              │
                    │  security (JSON)                     │
                    │    { twoFactorEnabled, ... }         │
                    └─────┬──────────────────┬─────────────┘
                          │                  │
                          │ 1:0..1           │ 1:0..1
                          │                  │
            ┌─────────────▼──────┐    ┌─────▼──────────────────┐
            │      Agent          │    │      Customer          │
            │  PK: id             │    │  PK: id                │
            │  FK: tenant_id      │    │  FK: tenant_id         │
            │  FK: user_id        │    │  FK: user_id           │
            │  FK: parent_agent_id│    │  FK: referral_agent_id │
            │  ──────────────────│    │  ────────────────────  │
            │  name               │    │  wallet (JSON) 🔑      │
            │  code (unique)      │    │    {                   │
            │  path 🔑            │    │      address,          │
            │  level              │    │      isApproved,       │
            │  wallet (JSON) 🔑   │    │      approvedAmount,   │
            │    {                │    │      approvalTxHash    │
            │      address,       │    │    }                   │
            │      verified 🔑,   │    │  investmentStats       │
            │      chain          │    │    {                   │
            │    }                │    │      totalInvested,    │
            │  commission         │    │      currentBalance    │
            │    {                │    │    }                   │
            │      rate,          │    └────────────────────────┘
            │      isEnabled      │
            │    }                │
            │  stats              │
            │    {                │
            │      totalCustomers,│
            │      pendingCommission│
            │    }                │
            └─────────────────────┘
                      │
                      │ self-reference (無限層級)
                      │ parent_agent_id
                      │
                      └─────────┐
                                │
```

---

## 🗂️ 資料表詳細結構

### Table: `tenants` (租戶表)

```sql
CREATE TABLE tenants (
  -- 基本欄位
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(255) NOT NULL,
  slug                  VARCHAR(255) UNIQUE NOT NULL,
  email                 VARCHAR(255) UNIQUE NOT NULL,
  
  -- 狀態
  status                VARCHAR(50) NOT NULL DEFAULT 'active',
  plan                  VARCHAR(50) NOT NULL DEFAULT 'trial',
  trial_ends_at         TIMESTAMP,
  
  -- 🔑 分潤錢包組 (JSON Array - 可動態調整)
  revenue_wallets       JSONB NOT NULL DEFAULT '[]',
  /*
    [
      {
        "id": "uuid-1",
        "name": "營運錢包",
        "address": "TXxx...",
        "chain": "tron",
        "percentage": 60,
        "isActive": true,
        "verified": true,
        "verifiedAt": "2024-11-28T...",
        "description": "主要營運資金"
      },
      {
        "id": "uuid-2",
        "name": "技術錢包",
        "address": "TYyy...",
        "chain": "tron",
        "percentage": 30,
        "isActive": true,
        "verified": true,
        "verifiedAt": "2024-11-28T..."
      },
      {
        "id": "uuid-3",
        "name": "儲備錢包",
        "address": "TZzz...",
        "chain": "tron",
        "percentage": 10,
        "isActive": true,
        "verified": false
      }
    ]
    
    ⚠️ 所有 isActive=true 的錢包 percentage 加總必須 = 100
  */
  
  -- 虛擬貨幣配置
  crypto_config         JSONB NOT NULL,
  /*
    {
      "supportedChains": ["tron"],
      "supportedTokens": ["USDT", "TRX"],
      "investmentContractAddress": "TContract...",
      "usdtTokenAddress": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      "minInvestment": 100,
      "maxInvestment": 100000,
      "platformFeeRate": 2.0,
      "withdrawalFeeRate": 0.5
    }
  */
  
  -- 白標
  custom_domain         VARCHAR(255),
  branding              JSONB,
  
  -- 時間戳
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMP,
  
  -- 索引
  INDEX idx_tenants_slug (slug),
  INDEX idx_tenants_email (email),
  INDEX idx_tenants_status (status),
  INDEX idx_tenants_plan (plan)
);
```

---

### Table: `users` (用戶表 - 統一認證層)

```sql
CREATE TABLE users (
  -- 基本欄位
  id                    SERIAL PRIMARY KEY,
  tenant_id             INTEGER REFERENCES tenants(id),
  
  -- 認證
  email                 VARCHAR(255) NOT NULL,
  password              VARCHAR(255) NOT NULL, -- bcrypt
  name                  VARCHAR(255) NOT NULL,
  
  -- 角色與狀態
  role                  VARCHAR(50) NOT NULL,
  /*
    - platform_admin (Platform 層，tenant_id = NULL)
    - tenant_admin
    - agent
    - customer
  */
  status                VARCHAR(50) NOT NULL DEFAULT 'active',
  
  -- 安全設置
  security              JSONB NOT NULL DEFAULT '{}',
  /*
    {
      "twoFactorEnabled": false,
      "twoFactorSecret": "...",
      "lastPasswordChange": "2024-11-28T...",
      "failedLoginAttempts": 0,
      "lastFailedLogin": null
    }
  */
  
  -- 登入追蹤
  last_login_at         TIMESTAMP,
  last_login_ip         VARCHAR(45),
  
  -- Email 驗證
  email_verified        BOOLEAN NOT NULL DEFAULT false,
  email_verified_at     TIMESTAMP,
  
  -- 時間戳
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMP,
  
  -- 約束與索引
  UNIQUE (email, tenant_id),
  INDEX idx_users_email (email),
  INDEX idx_users_tenant (tenant_id),
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
);
```

---

### Table: `agents` (代理商表)

```sql
CREATE TABLE agents (
  -- 基本欄位
  id                    SERIAL PRIMARY KEY,
  tenant_id             INTEGER NOT NULL REFERENCES tenants(id),
  user_id               INTEGER NOT NULL REFERENCES users(id),
  
  -- 基本資訊
  name                  VARCHAR(255) NOT NULL,
  code                  VARCHAR(50) NOT NULL, -- 邀請碼
  
  -- 🔑 無限層級代理結構
  parent_agent_id       INTEGER REFERENCES agents(id),
  path                  VARCHAR(500) NOT NULL DEFAULT 'root',
  /*
    路徑格式: "root" | "root/1" | "root/1/5" | "root/1/5/12"
    用於快速查詢所有下級代理
  */
  level                 INTEGER NOT NULL DEFAULT 0,
  /*
    0 = 頂級代理
    1 = 二級代理
    2 = 三級代理
    ...
  */
  
  -- 🔑 代理商分潤錢包 (可驗證)
  wallet                JSONB,
  /*
    {
      "address": "TAgent...",
      "chain": "tron",
      "verified": true,  // 🔑 驗證狀態
      "verifiedAt": "2024-11-28T...",
      "verificationTxHash": "0x...", // 驗證交易 hash
      "lastPaidAt": "2024-11-28T..." // 最後分潤時間
    }
  */
  
  -- 佣金設置
  commission            JSONB NOT NULL,
  /*
    {
      "rate": 5.0,        // 5%
      "isEnabled": true,
      "customRates": {    // 可選：針對不同層級的客戶
        "vip1": 6.0,
        "vip2": 7.0
      }
    }
  */
  
  -- 狀態
  status                VARCHAR(50) NOT NULL DEFAULT 'active',
  
  -- 統計數據
  stats                 JSONB NOT NULL DEFAULT '{}',
  /*
    {
      "totalCustomers": 0,
      "activeCustomers": 0,
      "totalSubAgents": 0,
      "totalInvestmentVolume": 0,
      "totalCommissionEarned": 0,
      "pendingCommission": 0,
      "thisMonthVolume": 0,
      "thisMonthCommission": 0
    }
  */
  
  -- 備註
  notes                 TEXT,
  
  -- 時間戳
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMP,
  
  -- 約束與索引
  UNIQUE (tenant_id, code),
  INDEX idx_agents_tenant (tenant_id),
  INDEX idx_agents_user (user_id),
  INDEX idx_agents_parent (parent_agent_id),
  INDEX idx_agents_path (path),
  INDEX idx_agents_level (level),
  INDEX idx_agents_status (status),
  INDEX idx_agents_code (code)
);
```

---

### Table: `customers` (投資客戶表)

```sql
CREATE TABLE customers (
  -- 基本欄位
  id                    SERIAL PRIMARY KEY,
  tenant_id             INTEGER NOT NULL REFERENCES tenants(id),
  user_id               INTEGER NOT NULL REFERENCES users(id),
  referral_agent_id     INTEGER REFERENCES agents(id),
  
  -- 狀態
  status                VARCHAR(50) NOT NULL DEFAULT 'active',
  
  -- 🔑 客戶錢包 (用於合約互動)
  wallet                JSONB,
  /*
    {
      "address": "TCustomer...",
      "chain": "tron",
      
      // 合約授權狀態
      "isApproved": true,
      "approvedAmount": "1000000",  // BigNumber string (USDT)
      "approvedAt": "2024-11-28T...",
      "approvalTxHash": "0x...",
      
      // 餘額快取 (可選)
      "lastBalanceCheck": "2024-11-28T...",
      "cachedUsdtBalance": "5000",
      
      // 驗證 (可選)
      "verified": true,
      "verifiedAt": "2024-11-28T..."
    }
  */
  
  -- 投資統計
  investment_stats      JSONB NOT NULL DEFAULT '{}',
  /*
    {
      "totalInvested": 0,
      "currentBalance": 0,
      "totalProfit": 0,
      "totalWithdrawn": 0,
      "totalDeposit": 0,
      "investmentCount": 0,
      "firstInvestmentAt": null,
      "lastInvestmentAt": null
    }
  */
  
  -- VIP 等級
  vip_level             INTEGER NOT NULL DEFAULT 0,
  
  -- 備註
  notes                 TEXT,
  
  -- 時間戳
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMP,
  
  -- 索引
  INDEX idx_customers_tenant (tenant_id),
  INDEX idx_customers_user (user_id),
  INDEX idx_customers_referral (referral_agent_id),
  INDEX idx_customers_status (status),
  INDEX idx_customers_vip (vip_level)
);
```

---

## 🔗 關聯關係圖

### 1. Tenant ↔ Users (1:N)

```
Tenant (1)
  └── has many ──→ Users (N)
  
查詢範例:
- 獲取租戶的所有用戶
- 用戶屬於哪個租戶
```

### 2. User ↔ Agent (1:0..1)

```
User (1)
  └── may have ──→ Agent (0..1)
  
規則:
- role = 'agent' 的 User 必須有對應的 Agent 記錄
- 其他 role 沒有 Agent 記錄
```

### 3. User ↔ Customer (1:0..1)

```
User (1)
  └── may have ──→ Customer (0..1)
  
規則:
- role = 'customer' 的 User 必須有對應的 Customer 記錄
- 其他 role 沒有 Customer 記錄
```

### 4. Agent ↔ Agent (Self-Reference - 無限層級)

```
Agent (Parent)
  └── has many ──→ Agents (Children)
  
結構:
root
├── Agent A (level 0, path: 'root/1')
│   ├── Agent A1 (level 1, path: 'root/1/3')
│   │   └── Agent A1a (level 2, path: 'root/1/3/7')
│   └── Agent A2 (level 1, path: 'root/1/5')
└── Agent B (level 0, path: 'root/2')
    └── Agent B1 (level 1, path: 'root/2/6')
```

### 5. Agent ↔ Customer (1:N)

```
Agent (1)
  └── referred ──→ Customers (N)
  
查詢範例:
- 代理商的所有客戶
- 客戶的推薦代理
```

---

## 📈 數據流程圖

### 分潤流程

```
                    投資事件觸發
                         │
                         ▼
          ┌──────────────────────────────┐
          │   計算分潤金額                 │
          │   - platformFee = 2%          │
          │   - agentCommission = 5%      │
          └──────────────┬───────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
  ┌─────────────────┐      ┌──────────────────┐
  │  平台分潤        │      │  代理商佣金       │
  │  (platformFee)  │      │  (commission)    │
  └────────┬────────┘      └────────┬─────────┘
           │                        │
           ▼                        ▼
  ┌─────────────────────────────────────────┐
  │      分配到多個錢包                      │
  │                                         │
  │  revenueWallets.forEach(wallet => {    │
  │    amount = platformFee * percentage   │
  │    transfer(wallet.address, amount)    │
  │  })                                     │
  │                                         │
  │  transfer(agent.wallet.address,        │
  │          agentCommission)               │
  └─────────────────────────────────────────┘
```

---

## 🎨 關鍵設計決策

### 1. 為什麼 revenueWallets 用 JSONB？

```yaml
優點:
  ✅ 靈活：可隨時新增/刪除錢包
  ✅ 動態：比例可即時調整
  ✅ 歷史追蹤：可保存變更記錄
  ✅ 驗證：每個錢包獨立驗證狀態

缺點:
  ⚠️ 查詢複雜度：需要 JSON 操作
  
替代方案:
  如果需要頻繁查詢單個錢包，可考慮獨立表：
  
  CREATE TABLE tenant_revenue_wallets (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    name VARCHAR(255),
    address VARCHAR(255),
    percentage DECIMAL(5,2),
    ...
  );
```

### 2. 為什麼 Agent 和 Customer 不共用一個表？

```yaml
分開的原因:
  ✅ 欄位差異大
     - Agent: wallet, commission, stats
     - Customer: wallet.isApproved, investmentStats
  
  ✅ 查詢效能
     - 代理商查詢不需要掃描客戶資料
  
  ✅ 業務邏輯清晰
     - 代理商有推薦關係
     - 客戶有投資記錄
  
  ✅ 擴展性
     - 未來各自獨立演進
```

### 3. 為什麼需要 User 作為中間層？

```yaml
User 的作用:
  ✅ 統一認證：所有角色共用登入系統
  ✅ 角色轉換：Customer 可升級為 Agent
  ✅ 權限管理：基於 role 的權限控制
  ✅ 稽核追蹤：統一的操作日誌
  
範例:
  一個人可能同時是:
  - Tenant A 的 Admin
  - Tenant B 的 Agent
  - Tenant C 的 Customer
  
  透過 User + role 輕鬆管理
```

---

## 📊 資料量估算

### 預估規模（100 個租戶）

```yaml
Tenants: 100 筆
  - 每筆約 2KB (包含 JSON)
  - 總計: 200KB

Users: 10,000 筆
  - 每租戶平均 100 個用戶
  - 每筆約 1KB
  - 總計: 10MB

Agents: 2,000 筆
  - 20% 用戶是代理商
  - 每筆約 2KB (包含 stats)
  - 總計: 4MB

Customers: 7,000 筆
  - 70% 用戶是客戶
  - 每筆約 2KB (包含投資統計)
  - 總計: 14MB

總計核心表: ~30MB (不含交易記錄)
```

---

## 🚀 下一步討論點

### 需要討論的問題：

1. **revenueWallets 驗證流程**
   - 如何驗證錢包地址？
   - 驗證後才能啟用？
   - 驗證失敗如何處理？

2. **代理商錢包驗證**
   - 小額轉帳驗證？
   - 簽名驗證？
   - 第三方服務驗證？

3. **分潤比例調整**
   - 即時生效還是下一筆生效？
   - 需要審核嗎？
   - 歷史記錄如何追蹤？

4. **合約授權流程**
   - Customer 如何 approve 合約？
   - 授權金額不足時如何處理？
   - 需要監控授權狀態嗎？

5. **其他必要的表**
   - Investment（投資記錄）
   - Transaction（交易記錄）
   - CommissionPayout（佣金發放）
   - WalletVerification（錢包驗證記錄）

---

**看完這個 ER 圖，有什麼想討論的嗎？** 🤔

**或者要我補充其他相關的表？** 📊
