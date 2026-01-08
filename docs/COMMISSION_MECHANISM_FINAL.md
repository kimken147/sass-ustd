# 佣金分潤機制最終設計

## 🎯 核心需求確認

1. ✅ **錢包驗證**：第一次分潤時自動驗證
2. ✅ **比例調整**：即時生效
3. ✅ **代理層級**：無限層級 + 分潤比率（代理與上級分潤）
4. ✅ **額外表**：commission_payouts + revenue_distributions

---

## 🔑 核心問題：代理商分潤比率設計

### 問題說明

```
場景：客戶投資 1000 USDT，平台抽成 100 USDT 後剩餘 900 USDT

傳統方式（每層固定比例）:
├─ Level 0 Agent (10%) → 90 USDT
├─ Level 1 Agent (5%) → 45 USDT
└─ Level 2 Agent (3%) → 27 USDT

你的需求（代理與上級分潤）:
├─ Level 2 Agent (實際推薦人) → 先拿一部分
├─ Level 1 Agent → 從 Level 2 的佣金中分一部分
└─ Level 0 Agent → 從 Level 1 的佣金中分一部分
```

---

## 💡 推薦設計：**向上分潤比率**

### 方案 A：代理商保留比率（推薦）⭐

```typescript
// Agent 設定
{
  commission: {
    selfRate: 60,      // 自己保留 60%
    uplineRate: 40,    // 給上級 40%
    baseRate: 5.0      // 基礎佣金率 5%
  }
}
```

### 實際計算範例

```
客戶投資: 1000 USDT
基礎佣金: 1000 × 5% = 50 USDT

代理商結構:
┌──────────────────────────────────────┐
│ Level 0: Agent A                     │
│   selfRate: 70%, uplineRate: 30%     │
└──────────────────────────────────────┘
              ▲
              │ 上級
┌──────────────────────────────────────┐
│ Level 1: Agent B                     │
│   selfRate: 60%, uplineRate: 40%     │
└──────────────────────────────────────┘
              ▲
              │ 上級
┌──────────────────────────────────────┐
│ Level 2: Agent C (實際推薦人)         │
│   selfRate: 50%, uplineRate: 50%     │
└──────────────────────────────────────┘
              ▲
              │ 推薦
         [Customer]

計算過程:
1. Agent C (Level 2 - 直接推薦人)
   - 總佣金: 50 USDT
   - 自己保留: 50 × 50% = 25 USDT ✅
   - 給上級: 50 × 50% = 25 USDT → 傳給 Agent B

2. Agent B (Level 1)
   - 收到上級傳來: 25 USDT
   - 自己保留: 25 × 60% = 15 USDT ✅
   - 給上級: 25 × 40% = 10 USDT → 傳給 Agent A

3. Agent A (Level 0 - 頂級)
   - 收到上級傳來: 10 USDT
   - 自己保留: 10 × 70% = 7 USDT ✅
   - 給上級: 10 × 30% = 3 USDT → 但沒有上級了
   
   ⚠️ 問題：剩餘的 3 USDT 怎麼處理？
   
選項:
  A. 全給頂級代理（Agent A 拿 10 USDT）
  B. 退回平台（計入 revenue）
  C. 分給所有參與的代理
```

---

### 方案 B：固定層級比率（備選）

```typescript
// Tenant 設定全局比率
{
  agentCommission: {
    baseRate: 5.0,           // 總佣金 5%
    levelRates: [
      { level: 0, rate: 2.0 },  // 直接推薦人 2%
      { level: 1, rate: 1.5 },  // 一級上線 1.5%
      { level: 2, rate: 1.0 },  // 二級上線 1.0%
      { level: 3, rate: 0.5 },  // 三級上線 0.5%
    ]
  }
}

計算:
Level 0 (直接): 1000 × 2.0% = 20 USDT
Level 1 (上級): 1000 × 1.5% = 15 USDT
Level 2 (上上級): 1000 × 1.0% = 10 USDT
Level 3 (上上上級): 1000 × 0.5% = 5 USDT
總計: 50 USDT (5%)
```

---

## 🎯 最終推薦設計

### 採用方案 A + 調整

```typescript
// Agent Entity
{
  commission: {
    baseRate: 5.0,      // 基礎佣金率（相對於投資金額）
    selfRate: 60,       // 自己保留比率（相對於收到的佣金）
    uplineRate: 40,     // 給上級的比率（相對於收到的佣金）
    isEnabled: true
  }
}

// 特殊規則：
// 1. 頂級代理（無上級）自動獲得全部剩餘佣金
// 2. selfRate + uplineRate 必須 = 100
```

---

## 🗄️ 更新後的 Entity 設計

### Agent Entity（更新版）

```typescript
import { Entity, Property, ManyToOne, Enum, Index, Unique } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface AgentCommission {
  baseRate: number;      // 基礎佣金率 (%)，例如 5.0 表示投資金額的 5%
  selfRate: number;      // 自己保留的比率 (%)，例如 60 表示收到佣金的 60%
  uplineRate: number;    // 給上級的比率 (%)，例如 40 表示收到佣金的 40%
  isEnabled: boolean;
  
  // 驗證規則：selfRate + uplineRate = 100
}

export interface AgentWallet {
  address: string;
  chain: 'tron';
  verified: boolean;           // 是否驗證過
  verifiedAt?: Date;           // 驗證時間（第一次收到分潤時）
  verificationTxHash?: string; // 第一次分潤交易 hash
  lastPaidAt?: Date;
  totalPaidAmount: number;     // 累計已分潤金額
}

export interface AgentStats {
  // 客戶統計
  totalCustomers: number;
  activeCustomers: number;
  
  // 下級代理統計
  totalSubAgents: number;
  directSubAgents: number;     // 直接下級數量
  
  // 投資統計
  totalInvestmentVolume: number;
  thisMonthVolume: number;
  
  // 佣金統計
  totalCommissionEarned: number;      // 累計總佣金
  selfCommissionEarned: number;       // 自己保留的佣金
  uplineCommissionPassed: number;     // 傳給上級的佣金
  pendingCommission: number;          // 待發放佣金
  thisMonthCommission: number;
}

@Entity({ tableName: 'agents' })
@Unique({ properties: ['tenant', 'code'] })
export class Agent extends BaseEntity {
  @ManyToOne(() => Tenant)
  @Index()
  tenant!: Tenant;

  @ManyToOne(() => User)
  @Index()
  user!: User;

  @Property()
  name!: string;

  @Property()
  @Index()
  code!: string; // 邀請碼

  // 無限層級結構
  @ManyToOne(() => Agent, { nullable: true })
  @Index()
  parentAgent?: Agent;

  @Property({ default: 'root' })
  @Index()
  path: string = 'root';

  @Property({ default: 0 })
  @Index()
  level: number = 0;

  // 🔑 核心：分潤錢包
  @Property({ type: 'json', nullable: true })
  wallet?: AgentWallet;

  // 🔑 核心：佣金設置（向上分潤）
  @Property({ type: 'json' })
  commission: AgentCommission = {
    baseRate: 5.0,
    selfRate: 60,
    uplineRate: 40,
    isEnabled: true,
  };

  @Enum(() => AgentStatus)
  @Index()
  status: AgentStatus = AgentStatus.ACTIVE;

  // 統計數據
  @Property({ type: 'json' })
  stats: AgentStats = {
    totalCustomers: 0,
    activeCustomers: 0,
    totalSubAgents: 0,
    directSubAgents: 0,
    totalInvestmentVolume: 0,
    thisMonthVolume: 0,
    totalCommissionEarned: 0,
    selfCommissionEarned: 0,
    uplineCommissionPassed: 0,
    pendingCommission: 0,
    thisMonthCommission: 0,
  };

  @Property({ nullable: true, type: 'text' })
  notes?: string;
}
```

---

## 📊 新增表：commission_payouts

```typescript
import { Entity, Property, ManyToOne, Enum, Index } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';
import { Agent } from './agent.entity';
import { Customer } from './customer.entity';

export enum CommissionPayoutStatus {
  PENDING = 'pending',       // 待發放
  PROCESSING = 'processing', // 處理中
  COMPLETED = 'completed',   // 已完成
  FAILED = 'failed',         // 失敗
  CANCELLED = 'cancelled',   // 取消
}

export enum CommissionPayoutType {
  SELF = 'self',           // 自己保留的佣金
  FROM_DOWNLINE = 'from_downline', // 從下級收到的佣金
}

@Entity({ tableName: 'commission_payouts' })
export class CommissionPayout extends BaseEntity {
  @ManyToOne(() => Tenant)
  @Index()
  tenant!: Tenant;

  @ManyToOne(() => Agent)
  @Index()
  agent!: Agent; // 收款代理商

  @ManyToOne(() => Customer)
  @Index()
  customer!: Customer; // 投資客戶

  @ManyToOne(() => Agent, { nullable: true })
  @Index()
  sourceAgent?: Agent; // 佣金來源代理（如果是從下級傳上來的）

  @Enum(() => CommissionPayoutType)
  type!: CommissionPayoutType;

  // 金額資訊
  @Property({ type: 'decimal', precision: 20, scale: 6 })
  amount!: string; // USDT 金額

  @Property({ type: 'decimal', precision: 20, scale: 6 })
  originalInvestmentAmount!: string; // 原始投資金額

  @Property({ type: 'decimal', precision: 5, scale: 2 })
  commissionRate!: number; // 佣金率

  // 如果是向上分潤
  @Property({ type: 'decimal', precision: 20, scale: 6, nullable: true })
  receivedAmount?: string; // 從下級收到的金額

  @Property({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  selfRate?: number; // 保留比率

  @Property({ type: 'decimal', precision: 20, scale: 6, nullable: true })
  passedToUplineAmount?: string; // 傳給上級的金額

  // 錢包資訊
  @Property()
  walletAddress!: string; // 收款錢包地址

  @Property({ default: 'tron' })
  chain: string = 'tron';

  // 狀態
  @Enum(() => CommissionPayoutStatus)
  @Index()
  status: CommissionPayoutStatus = CommissionPayoutStatus.PENDING;

  // 交易資訊
  @Property({ nullable: true })
  txHash?: string; // 交易 hash

  @Property({ nullable: true })
  txError?: string; // 如果失敗，錯誤訊息

  @Property({ nullable: true })
  processedAt?: Date; // 處理時間

  @Property({ nullable: true })
  completedAt?: Date; // 完成時間

  // 第一次分潤自動驗證
  @Property({ default: false })
  isFirstPayout: boolean = false; // 是否為首次分潤（用於驗證錢包）

  @Property({ nullable: true, type: 'text' })
  notes?: string;
}
```

---

## 📊 新增表：revenue_distributions

```typescript
import { Entity, Property, ManyToOne, Enum, Index } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';
import { Customer } from './customer.entity';

export enum RevenueDistributionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum RevenueDistributionType {
  PLATFORM_FEE = 'platform_fee',     // 平台手續費
  WITHDRAWAL_FEE = 'withdrawal_fee', // 提領手續費
  PENALTY = 'penalty',               // 罰金
  OTHER = 'other',                   // 其他
}

@Entity({ tableName: 'revenue_distributions' })
export class RevenueDistribution extends BaseEntity {
  @ManyToOne(() => Tenant)
  @Index()
  tenant!: Tenant;

  @ManyToOne(() => Customer)
  @Index()
  customer!: Customer; // 來源客戶

  @Enum(() => RevenueDistributionType)
  @Index()
  type!: RevenueDistributionType;

  // 總金額
  @Property({ type: 'decimal', precision: 20, scale: 6 })
  totalAmount!: string; // 總分潤金額

  @Property({ type: 'decimal', precision: 20, scale: 6 })
  originalAmount!: string; // 原始金額（投資金額）

  @Property({ type: 'decimal', precision: 5, scale: 2 })
  feeRate!: number; // 費率

  // 分潤錢包資訊（snapshot - 記錄當下的配置）
  @Property({ type: 'json' })
  walletDistributions!: {
    walletId: string;
    walletName: string;
    walletAddress: string;
    percentage: number;
    amount: string;
    txHash?: string;
    status: 'pending' | 'completed' | 'failed';
    completedAt?: Date;
  }[];

  // 整體狀態
  @Enum(() => RevenueDistributionStatus)
  @Index()
  status: RevenueDistributionStatus = RevenueDistributionStatus.PENDING;

  @Property({ nullable: true })
  processedAt?: Date;

  @Property({ nullable: true })
  completedAt?: Date;

  @Property({ nullable: true, type: 'text' })
  notes?: string;
}
```

---

## 💰 完整分潤計算流程

### 範例：客戶投資 1000 USDT

```typescript
// 配置
const tenant = {
  cryptoConfig: {
    platformFeeRate: 2.0, // 2%
  },
  revenueWallets: [
    { id: 'w1', address: 'TXxx...', percentage: 60 },
    { id: 'w2', address: 'TYyy...', percentage: 30 },
    { id: 'w3', address: 'TZzz...', percentage: 10 },
  ]
};

const agentC = { // Level 2 - 直接推薦人
  commission: { baseRate: 5.0, selfRate: 50, uplineRate: 50 },
  wallet: { address: 'TAgentC...', verified: false }
};

const agentB = { // Level 1
  commission: { baseRate: 5.0, selfRate: 60, uplineRate: 40 },
  wallet: { address: 'TAgentB...', verified: true }
};

const agentA = { // Level 0 - 頂級
  commission: { baseRate: 5.0, selfRate: 70, uplineRate: 30 },
  wallet: { address: 'TAgentA...', verified: true }
};

// ==================== 計算流程 ====================

// 1️⃣ 平台手續費
const platformFee = 1000 * 0.02; // = 20 USDT

// 創建 revenue_distribution 記錄
const revenueDistribution = {
  totalAmount: 20,
  walletDistributions: [
    { walletId: 'w1', amount: 20 * 0.60, percentage: 60 }, // 12 USDT
    { walletId: 'w2', amount: 20 * 0.30, percentage: 30 }, // 6 USDT
    { walletId: 'w3', amount: 20 * 0.10, percentage: 10 }, // 2 USDT
  ]
};

// 2️⃣ 代理商佣金
const totalCommission = 1000 * 0.05; // = 50 USDT

// 2.1 Agent C (Level 2 - 直接推薦人)
const agentC_self = 50 * 0.50;      // 25 USDT (自己保留)
const agentC_upline = 50 * 0.50;    // 25 USDT (給上級)

// 創建 commission_payout 記錄
const payoutC = {
  agent: agentC,
  amount: 25,
  type: 'self',
  walletAddress: 'TAgentC...',
  isFirstPayout: true, // 🔑 第一次分潤，交易成功後自動驗證
  status: 'pending'
};

// 2.2 Agent B (Level 1)
const agentB_received = 25;         // 從 Agent C 收到
const agentB_self = 25 * 0.60;      // 15 USDT (自己保留)
const agentB_upline = 25 * 0.40;    // 10 USDT (給上級)

const payoutB1 = {
  agent: agentB,
  amount: 15,
  type: 'self',
  status: 'pending'
};

const payoutB2 = {
  agent: agentB,
  sourceAgent: agentC,
  amount: 25,
  type: 'from_downline',
  passedToUplineAmount: 10,
  status: 'pending'
};

// 2.3 Agent A (Level 0 - 頂級)
const agentA_received = 10;         // 從 Agent B 收到
const agentA_self = 10 * 0.70;      // 7 USDT (自己保留)
const agentA_upline = 10 * 0.30;    // 3 USDT (無上級，全給自己)
const agentA_total = 7 + 3;         // 10 USDT

const payoutA = {
  agent: agentA,
  amount: 10, // 全拿（因為是頂級）
  type: 'from_downline',
  sourceAgent: agentB,
  status: 'pending'
};

// 3️⃣ 淨投資金額
const netInvestment = 1000 - 20 - 50; // = 930 USDT
```

---

## 🔄 自動錢包驗證流程

```typescript
// 發放佣金時
async function processCommissionPayout(payout: CommissionPayout) {
  try {
    // 1. 檢查是否為首次分潤
    if (payout.isFirstPayout && !payout.agent.wallet.verified) {
      console.log('🔍 首次分潤，將自動驗證錢包');
    }
    
    // 2. 執行轉帳
    const txHash = await transferUSDT(
      payout.walletAddress,
      payout.amount
    );
    
    // 3. 更新 payout 狀態
    payout.txHash = txHash;
    payout.status = 'completed';
    payout.completedAt = new Date();
    
    // 4. 🔑 如果是首次分潤，自動驗證錢包
    if (payout.isFirstPayout) {
      payout.agent.wallet.verified = true;
      payout.agent.wallet.verifiedAt = new Date();
      payout.agent.wallet.verificationTxHash = txHash;
      console.log('✅ 錢包驗證成功');
    }
    
    // 5. 更新統計
    payout.agent.stats.totalCommissionEarned += parseFloat(payout.amount);
    payout.agent.wallet.totalPaidAmount += parseFloat(payout.amount);
    payout.agent.wallet.lastPaidAt = new Date();
    
  } catch (error) {
    payout.status = 'failed';
    payout.txError = error.message;
  }
}
```

---

## 📋 數據庫 Schema 更新

### commission_payouts 表

```sql
CREATE TABLE commission_payouts (
  id                          SERIAL PRIMARY KEY,
  tenant_id                   INTEGER NOT NULL REFERENCES tenants(id),
  agent_id                    INTEGER NOT NULL REFERENCES agents(id),
  customer_id                 INTEGER NOT NULL REFERENCES customers(id),
  source_agent_id             INTEGER REFERENCES agents(id),
  
  -- 類型
  type                        VARCHAR(50) NOT NULL,
  
  -- 金額
  amount                      DECIMAL(20, 6) NOT NULL,
  original_investment_amount  DECIMAL(20, 6) NOT NULL,
  commission_rate             DECIMAL(5, 2) NOT NULL,
  
  -- 向上分潤相關
  received_amount             DECIMAL(20, 6),
  self_rate                   DECIMAL(5, 2),
  passed_to_upline_amount     DECIMAL(20, 6),
  
  -- 錢包
  wallet_address              VARCHAR(255) NOT NULL,
  chain                       VARCHAR(50) DEFAULT 'tron',
  
  -- 狀態
  status                      VARCHAR(50) NOT NULL DEFAULT 'pending',
  
  -- 交易
  tx_hash                     VARCHAR(255),
  tx_error                    TEXT,
  processed_at                TIMESTAMP,
  completed_at                TIMESTAMP,
  
  -- 驗證
  is_first_payout             BOOLEAN DEFAULT false,
  
  -- 備註
  notes                       TEXT,
  
  -- 時間戳
  created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at                  TIMESTAMP,
  
  -- 索引
  INDEX idx_commission_payouts_tenant (tenant_id),
  INDEX idx_commission_payouts_agent (agent_id),
  INDEX idx_commission_payouts_customer (customer_id),
  INDEX idx_commission_payouts_status (status),
  INDEX idx_commission_payouts_created (created_at)
);
```

### revenue_distributions 表

```sql
CREATE TABLE revenue_distributions (
  id                    SERIAL PRIMARY KEY,
  tenant_id             INTEGER NOT NULL REFERENCES tenants(id),
  customer_id           INTEGER NOT NULL REFERENCES customers(id),
  
  -- 類型
  type                  VARCHAR(50) NOT NULL,
  
  -- 金額
  total_amount          DECIMAL(20, 6) NOT NULL,
  original_amount       DECIMAL(20, 6) NOT NULL,
  fee_rate              DECIMAL(5, 2) NOT NULL,
  
  -- 錢包分配（JSON）
  wallet_distributions  JSONB NOT NULL,
  /*
    [
      {
        "walletId": "uuid",
        "walletName": "營運錢包",
        "walletAddress": "TXxx...",
        "percentage": 60,
        "amount": "12.000000",
        "txHash": "0x...",
        "status": "completed",
        "completedAt": "2024-11-28T..."
      }
    ]
  */
  
  -- 狀態
  status                VARCHAR(50) NOT NULL DEFAULT 'pending',
  processed_at          TIMESTAMP,
  completed_at          TIMESTAMP,
  
  -- 備註
  notes                 TEXT,
  
  -- 時間戳
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMP,
  
  -- 索引
  INDEX idx_revenue_distributions_tenant (tenant_id),
  INDEX idx_revenue_distributions_customer (customer_id),
  INDEX idx_revenue_distributions_type (type),
  INDEX idx_revenue_distributions_status (status),
  INDEX idx_revenue_distributions_created (created_at)
);
```

---

## 🎯 總結

### 已確定的設計

1. ✅ **錢包驗證**：第一次分潤自動驗證
2. ✅ **比例調整**：即時生效（直接更新 JSON）
3. ✅ **代理分潤**：selfRate + uplineRate = 100
4. ✅ **新增表**：commission_payouts + revenue_distributions

### 核心表結構

```
tenants
  └─ revenueWallets[] (平台分潤錢包組)

users
  └─ role (統一認證)

agents
  ├─ wallet (代理商錢包 - 第一次分潤時驗證)
  ├─ commission (selfRate + uplineRate)
  └─ stats (詳細統計)

customers
  └─ wallet (客戶錢包 - 合約授權)

commission_payouts (代理商佣金記錄)
  ├─ type: 'self' | 'from_downline'
  └─ is_first_payout (觸發自動驗證)

revenue_distributions (平台分潤記錄)
  └─ wallet_distributions[] (每個錢包的分配)
```

---

## ✅ 下一步

**現在可以開始創建 Entity 檔案了！**

要我立即創建所有 Entity 檔案嗎？包括：
1. ✅ tenant.entity.ts
2. ✅ user.entity.ts
3. ✅ agent.entity.ts (含新的 commission 結構)
4. ✅ customer.entity.ts
5. ✅ commission-payout.entity.ts (新)
6. ✅ revenue-distribution.entity.ts (新)

**準備好了嗎？** 🚀
