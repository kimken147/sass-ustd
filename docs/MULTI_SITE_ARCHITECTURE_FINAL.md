# 多站系統完整架構設計

## 🎯 核心架構理解

### 層級結構

```
┌─────────────────────────────────────────────────────────────┐
│                    Platform Level                            │
│                  (總後台管理所有站)                           │
│                                                              │
│  Platform Admin (超級管理員)                                 │
│    └─ 管理所有 Tenant (站)                                   │
│    └─ 設定每個站的系統費率                                   │
│    └─ 系統商錢包（收取系統費）                               │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
│  Tenant A    │  │  Tenant B    │  │  Tenant C    │
│  (站 A)      │  │  (站 B)      │  │  (站 C)      │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ url          │  │ url          │  │ url          │
│ logo         │  │ logo         │  │ logo         │
│ 營運錢包[]   │  │ 營運錢包[]   │  │ 營運錢包[]   │
│ 系統費率     │  │ 系統費率     │  │ 系統費率     │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
   ┌───▼───┐         ┌───▼───┐         ┌───▼───┐
   │頂級   │         │頂級   │         │頂級   │
   │代理   │         │代理   │         │代理   │
   │(租戶) │         │(租戶) │         │(租戶) │
   └───┬───┘         └───┬───┘         └───┬───┘
       │                 │                 │
     Agent             Agent             Agent
     Tree              Tree              Tree
```

---

## 💰 完整分潤流程

### 投資 1000 USDT 的完整分配

```
客戶投資: 1000 USDT
    │
    ├─ 1️⃣ 系統費 (由總後台設定，例如 1%)
    │   └─ 10 USDT → 系統商錢包 (Platform)
    │
    ├─ 2️⃣ 租戶平台費 (由租戶設定，例如 2%)
    │   └─ 20 USDT → 租戶營運錢包組
    │       ├─ 營運錢包 60% = 12 USDT
    │       ├─ 技術錢包 30% = 6 USDT
    │       └─ 儲備錢包 10% = 2 USDT
    │
    └─ 3️⃣ 代理佣金 (例如 5%)
        └─ 50 USDT → 代理樹狀分潤
            ├─ Level 2 Agent: 25 USDT
            ├─ Level 1 Agent: 15 USDT
            └─ Level 0 Agent (頂級 = 租戶): 10 USDT
            
淨投資: 1000 - 10 - 20 - 50 = 920 USDT
```

---

## 🗄️ 更新後的資料結構

### Platform Level（總後台）

```typescript
// SystemWallet Entity（系統商錢包）
export enum SystemWalletType {
  CONTRACT_EXECUTION = "contract_execution",     // 執行合約的錢包
  REVENUE_DISTRIBUTION = "revenue_distribution", // 分潤的錢包
}

export enum SystemWalletChain {
  TRON = "tron",
  ETHEREUM = "ethereum",
  BSC = "bsc",
}

@Entity({ tableName: "system_wallets" })
export class SystemWallet extends BaseEntity {
  name!: string;              // 錢包名稱
  address!: string;           // 錢包地址
  chain!: SystemWalletChain;  // 區塊鏈
  type!: SystemWalletType;    // 錢包類型
  status!: SystemWalletStatus; // 狀態
  verified!: boolean;         // 是否已驗證
  totalRevenue!: string;      // 累計系統費收入
  // ...
}

// 租戶指派系統錢包（用於分潤）
export interface SystemWalletAssignment {
  walletId: number;    // 系統商錢包 ID
  address: string;     // 錢包地址（複製，供 tenant-api 使用）
  name: string;        // 錢包名稱（複製）
  chain: string;       // 區塊鏈（複製）
  percentage: number;  // 分潤比例（整數，%）
  syncedAt: Date;      // 同步時間
}
```

---

### Tenant Entity（更新版）

```typescript
import { Entity, Property, Enum, Index, Unique, OneToMany } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export enum TenantPlan {
  TRIAL = 'trial',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

// 租戶分潤錢包配置
export interface RevenueWallet {
  id: string;
  name: string;
  address: string;
  chain: 'tron';
  percentage: number;
  isActive: boolean;
  verified: boolean;           // 🔑 第一次分潤時驗證
  verifiedAt?: Date;
  verificationTxHash?: string;
  totalPaidAmount: number;
  lastPaidAt?: Date;
  description?: string;
}

export interface TenantCryptoConfig {
  supportedChains: string[];
  supportedTokens: string[];
  
  // 合約地址
  investmentContractAddress: string;
  usdtTokenAddress: string;
  
  // 投資限制
  minInvestment: number;
  maxInvestment: number;
  
  // 🔑 費率設置（租戶層級）
  platformFeeRate: number;      // 租戶平台手續費 (%)
  withdrawalFeeRate: number;    // 提領手續費 (%)
}

// 🔑 新增：白標配置
export interface TenantBranding {
  logo?: string;                // Logo URL
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  companyName?: string;
  contactEmail?: string;
  supportUrl?: string;
}

@Entity({ tableName: 'tenants' })
export class Tenant extends BaseEntity {
  @Property()
  @Unique()
  @Index()
  name!: string;

  @Property()
  @Unique()
  @Index()
  slug!: string;

  @Property()
  @Unique()
  @Index()
  email!: string;

  // 🔑 新增：自訂 URL（由總後台設定）
  @Property({ nullable: true })
  @Unique()
  customUrl?: string; // 例如: 'tenant-a.example.com' 或 'https://custom-domain.com'

  // 🔑 新增：Logo（由總後台設定）
  @Property({ type: 'json', nullable: true })
  branding?: TenantBranding;

  @Enum(() => TenantStatus)
  @Index()
  status: TenantStatus = TenantStatus.ACTIVE;

  @Enum(() => TenantPlan)
  @Index()
  plan: TenantPlan = TenantPlan.TRIAL;

  // 🔑 核心：租戶營運錢包組（即時生效 + 第一次分潤驗證）
  @Property({ type: 'json' })
  revenueWallets: RevenueWallet[] = [];

  // 🔑 新增：系統費率（由總後台設定）
  @Property({ type: 'decimal', precision: 5, scale: 2 })
  systemFeeRate: number = 1.0; // 預設 1%

  // 虛擬貨幣配置
  @Property({ type: 'json' })
  cryptoConfig: TenantCryptoConfig = {
    supportedChains: ['tron'],
    supportedTokens: ['USDT', 'TRX'],
    investmentContractAddress: '',
    usdtTokenAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    minInvestment: 100,
    maxInvestment: 100000,
    platformFeeRate: 2.0,      // 租戶平台費 2%
    withdrawalFeeRate: 0.5,
  };

  @Property({ nullable: true })
  customDomain?: string;

  @OneToMany(() => User, user => user.tenant)
  users!: Collection<User>;
}
```

---

### Agent Entity（確認頂級代理）

```typescript
export interface AgentCommission {
  baseRate: number;      // 基礎佣金率 (%)
  selfRate: number;      // 自己保留的比率 (%)
  uplineRate: number;    // 給上級的比率 (%)
  isEnabled: boolean;
}

@Entity({ tableName: 'agents' })
export class Agent extends BaseEntity {
  // ... 其他欄位

  // 🔑 頂級代理判斷
  @ManyToOne(() => Agent, { nullable: true })
  @Index()
  parentAgent?: Agent;
  
  // 如果 parentAgent = null，則此代理為頂級代理（租戶本人）
  
  @Property({ default: 0 })
  @Index()
  level: number = 0;
  // level = 0 且 parentAgent = null → 租戶（頂級代理）
  
  @Property({ type: 'json' })
  commission: AgentCommission = {
    baseRate: 5.0,
    selfRate: 100,     // 🔑 頂級代理 selfRate = 100（拿全部）
    uplineRate: 0,     // 🔑 頂級代理 uplineRate = 0（無上級）
    isEnabled: true,
  };
}
```

---

## 📊 新增表：system_fee_distributions

```typescript
import { Entity, Property, ManyToOne, Enum, Index } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';
import { Customer } from './customer.entity';

export enum SystemFeeDistributionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum SystemFeeDistributionType {
  INVESTMENT_FEE = 'investment_fee',   // 投資系統費
  WITHDRAWAL_FEE = 'withdrawal_fee',   // 提領系統費
  OTHER = 'other',
}

@Entity({ tableName: 'system_fee_distributions' })
export class SystemFeeDistribution extends BaseEntity {
  @ManyToOne(() => Tenant)
  @Index()
  tenant!: Tenant; // 來自哪個站

  @ManyToOne(() => Customer)
  @Index()
  customer!: Customer; // 來源客戶

  @Enum(() => SystemFeeDistributionType)
  @Index()
  type!: SystemFeeDistributionType;

  // 金額資訊
  @Property({ type: 'decimal', precision: 20, scale: 6 })
  amount!: string; // 系統費金額

  @Property({ type: 'decimal', precision: 20, scale: 6 })
  originalAmount!: string; // 原始投資金額

  @Property({ type: 'decimal', precision: 5, scale: 2 })
  feeRate!: number; // 系統費率（當下的費率）

  // 系統錢包資訊
  @Property()
  systemWalletAddress!: string; // 系統商錢包地址

  @Property({ default: 'tron' })
  chain: string = 'tron';

  // 狀態
  @Enum(() => SystemFeeDistributionStatus)
  @Index()
  status: SystemFeeDistributionStatus = SystemFeeDistributionStatus.PENDING;

  // 交易資訊
  @Property({ nullable: true })
  txHash?: string;

  @Property({ nullable: true })
  txError?: string;

  @Property({ nullable: true })
  processedAt?: Date;

  @Property({ nullable: true })
  completedAt?: Date;

  @Property({ nullable: true, type: 'text' })
  notes?: string;
}
```

---

## 💰 完整分潤計算流程（更新版）

```typescript
// ==================== 配置 ====================

// Platform 設定（總後台）
// 系統商錢包（兩種類型）
const systemWallets = [
  {
    id: 1,
    type: 'CONTRACT_EXECUTION',
    address: 'TContract...',
    name: '執行合約錢包',
  },
  {
    id: 2,
    type: 'REVENUE_DISTRIBUTION',
    address: 'TRevenue1...',
    name: '分潤錢包 1',
  },
  {
    id: 3,
    type: 'REVENUE_DISTRIBUTION',
    address: 'TRevenue2...',
    name: '分潤錢包 2',
  },
];

// Tenant 設定（由總後台設定）
const tenant = {
  systemFeeRate: 1.0,        // 🔑 系統費 1%（總後台設定）
  systemWallets: [           // 🔑 系統錢包指派（用於分潤）
    { walletId: 2, address: 'TRevenue1...', percentage: 60 },
    { walletId: 3, address: 'TRevenue2...', percentage: 40 },
  ],  // 比例總和必須 = 100%
  cryptoConfig: {
    platformFeeRate: 2.0,    // 租戶平台費 2%
  },
  revenueWallets: [
    { address: 'TXxx...', percentage: 60, verified: false },
    { address: 'TYyy...', percentage: 30, verified: true },
    { address: 'TZzz...', percentage: 10, verified: true },
  ]
};

// 代理結構
const topAgent = {        // 頂級代理（租戶本人）
  parentAgent: null,
  level: 0,
  commission: { baseRate: 5.0, selfRate: 100, uplineRate: 0 }
};

const agentB = {         // Level 1
  parentAgent: topAgent,
  level: 1,
  commission: { baseRate: 5.0, selfRate: 60, uplineRate: 40 }
};

const agentC = {         // Level 2（直接推薦人）
  parentAgent: agentB,
  level: 2,
  commission: { baseRate: 5.0, selfRate: 50, uplineRate: 50 }
};

// ==================== 計算流程 ====================

const investment = 1000; // USDT

// 1️⃣ 系統費（總後台收取）
const systemFee = investment * 0.01; // = 10 USDT

// 按 tenant.systemWallets 的比例分配到多個系統錢包
const systemFeeDistributions = tenant.systemWallets.map(sw => {
  const amount = systemFee * (sw.percentage / 100);
  return {
    tenant: tenant,
    amount: amount,
    feeRate: 1.0,
    systemWalletAddress: sw.address,
    systemWalletId: sw.walletId,
    status: 'pending'
  };
});

// 💸 實時轉帳（逐個系統錢包）
for (const dist of systemFeeDistributions) {
  const txHash = await transferUSDT(dist.systemWalletAddress, dist.amount);
  dist.txHash = txHash;
  dist.status = 'completed';
  dist.completedAt = new Date();
}

// 2️⃣ 租戶平台費
const platformFee = investment * 0.02; // = 20 USDT

// 創建 revenue_distribution 記錄
const revenueDistribution = {
  totalAmount: 20,
  walletDistributions: [
    { 
      address: 'TXxx...', 
      amount: 12, 
      percentage: 60,
      isFirstPayout: true  // 🔑 第一次分潤，驗證錢包
    },
    { address: 'TYyy...', amount: 6, percentage: 30 },
    { address: 'TZzz...', amount: 2, percentage: 10 },
  ]
};

// 💸 實時轉帳（逐個錢包）
for (const wallet of revenueDistribution.walletDistributions) {
  const txHash = await transferUSDT(wallet.address, wallet.amount);
  wallet.txHash = txHash;
  wallet.status = 'completed';
  
  // 🔑 第一次分潤自動驗證
  if (wallet.isFirstPayout) {
    const tenantWallet = tenant.revenueWallets.find(w => w.address === wallet.address);
    tenantWallet.verified = true;
    tenantWallet.verifiedAt = new Date();
    tenantWallet.verificationTxHash = txHash;
  }
}

// 3️⃣ 代理佣金
const totalCommission = investment * 0.05; // = 50 USDT

// 3.1 Agent C (Level 2 - 直接推薦人)
const agentC_self = 50 * 0.50;      // 25 USDT
const agentC_upline = 50 * 0.50;    // 25 USDT

const payoutC = {
  agent: agentC,
  amount: 25,
  type: 'self',
  isFirstPayout: true,  // 🔑 第一次分潤，驗證錢包
  status: 'pending'
};

// 💸 實時轉帳
const txHashC = await transferUSDT(agentC.wallet.address, 25);
payoutC.txHash = txHashC;
payoutC.status = 'completed';

// 🔑 第一次分潤自動驗證
if (payoutC.isFirstPayout && !agentC.wallet.verified) {
  agentC.wallet.verified = true;
  agentC.wallet.verifiedAt = new Date();
  agentC.wallet.verificationTxHash = txHashC;
}

// 3.2 Agent B (Level 1)
const agentB_received = 25;
const agentB_self = 25 * 0.60;      // 15 USDT
const agentB_upline = 25 * 0.40;    // 10 USDT

const payoutB = {
  agent: agentB,
  amount: 15,
  type: 'self',
  status: 'pending'
};

// 💸 實時轉帳
await transferUSDT(agentB.wallet.address, 15);
payoutB.status = 'completed';

// 3.3 Top Agent (Level 0 - 租戶)
const topAgent_received = 10;
// selfRate = 100, uplineRate = 0
const topAgent_self = 10 * 1.00;    // 10 USDT (全拿)

const payoutTop = {
  agent: topAgent,
  amount: 10,
  type: 'from_downline',
  status: 'pending'
};

// 💸 實時轉帳
await transferUSDT(topAgent.wallet.address, 10);
payoutTop.status = 'completed';

// 4️⃣ 淨投資金額
const netInvestment = investment - systemFee - platformFee - totalCommission;
// = 1000 - 10 - 20 - 50 = 920 USDT
```

---

## 📋 總後台管理介面

### Platform Admin 功能

```yaml
租戶管理:
  ✅ 創建/編輯/刪除租戶
  ✅ 設定租戶 URL
  ✅ 上傳租戶 Logo
  ✅ 設定租戶系統費率
  ✅ 查看租戶收入統計

系統錢包管理:
  ✅ 設定系統商錢包地址
  ✅ 查看系統費收入統計
  ✅ 查看所有站的系統費記錄

全局設定:
  ✅ 預設系統費率
  ✅ 支援的鏈和代幣
```

---

## 🗂️ 完整資料表清單

### 核心表（7 個）

1. ✅ `tenants` - 租戶（加入 customUrl, logo, systemFeeRate）
2. ✅ `users` - 用戶
3. ✅ `agents` - 代理商（頂級代理 = 租戶）
4. ✅ `customers` - 投資客戶
5. ✅ `commission_payouts` - 代理佣金記錄
6. ✅ `revenue_distributions` - 租戶平台費記錄
7. ✅ `system_fee_distributions` - 系統費記錄（新）

### Platform Level 表（1 個）

8. ✅ `platform_settings` - 平台全局設定（系統錢包等）

---

## 🔄 完整分潤流程圖

```
投資事件
    │
    ▼
┌─────────────────────────────┐
│  計算所有費用和佣金          │
│  - systemFee                │
│  - platformFee              │
│  - agentCommission          │
└─────────────┬───────────────┘
              │
        並行處理（實時）
              │
    ┌─────────┼─────────┐
    │         │         │
    ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐
│ 系統費 │ │平台費  │ │代理佣金│
│ 轉帳   │ │ 轉帳   │ │ 轉帳   │
└───┬────┘ └───┬────┘ └───┬────┘
    │          │          │
    │      第一次?     第一次?
    │          │          │
    │      ✅驗證     ✅驗證
    │      錢包       錢包
    │          │          │
    └──────────┴──────────┘
              │
              ▼
      所有轉帳完成
              │
              ▼
      更新統計數據
```

---

## ✅ 最終確認

### 已確定的設計

1. ✅ **頂級代理 = 租戶**（selfRate 100%, uplineRate 0%）
2. ✅ **實時分潤**（投資完成立即轉帳）
3. ✅ **總後台設定**：
   - URL
   - Logo
   - 系統費率
4. ✅ **系統商錢包**（收取系統費，實時發放）
5. ✅ **第一次分潤驗證**（自動驗證所有錢包）

### 分潤順序

```
1️⃣ 系統費 → 系統商錢包（Platform）
2️⃣ 平台費 → 租戶營運錢包組（Tenant）
3️⃣ 代理佣金 → 代理樹（Agents，包含頂級=租戶）
```

---

## 🚀 準備創建 Entity

**現在要創建的檔案**：

```bash
packages/database/src/entities/
  ├── tenant.entity.ts (更新 - 加入 customUrl, branding, systemFeeRate)
  ├── user.entity.ts
  ├── agent.entity.ts (更新 - 頂級代理邏輯)
  ├── customer.entity.ts
  ├── commission-payout.entity.ts
  ├── revenue-distribution.entity.ts
  └── system-fee-distribution.entity.ts (新)

packages/database/src/entities/platform/
  └── platform-settings.entity.ts (新 - Platform Level)
```

**準備好了嗎？要我開始創建所有 Entity 檔案嗎？** 🎉
