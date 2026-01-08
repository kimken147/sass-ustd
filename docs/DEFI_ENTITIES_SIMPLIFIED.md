# DeFi 合約授權投資系統 Entity 設計（精簡版）

## 🎯 核心需求確認

1. ❌ **不需要** KYC 驗證
2. ❌ **不需要** AML 反洗錢
3. ✅ **使用** DeFi 合約 approve 授權機制
4. ✅ **租戶多錢包** 分潤（全站共用，按比率分配）
5. ✅ **代理商錢包** 分潤

---

## 📊 精簡後的架構

```
Tenant（租戶）
  ├─ revenueWallets[] (分潤錢包組 - 按比率)
  └─ User（用戶）
      ├─ Admin（管理員）
      ├─ Agent（代理商 - 有錢包）
      └─ Customer（投資客戶 - 用錢包授權）
```

---

## 🗄️ 精簡 Entity 設計

### 1️⃣ Tenant Entity（簡化版）

```typescript
import { Entity, Property, Enum, Index, Unique, Collection, OneToMany } from '@mikro-orm/core';
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
  id: string; // UUID
  name: string; // 例如: "營運錢包"
  address: string; // TRON 地址
  chain: 'tron'; // 目前只支援 TRON
  percentage: number; // 分潤比例 (%)
  isActive: boolean;
  description?: string;
}

export interface TenantCryptoConfig {
  supportedChains: string[]; // ['tron']
  supportedTokens: string[]; // ['USDT', 'TRX']
  
  // 合約地址
  investmentContractAddress: string; // 投資合約地址
  usdtTokenAddress: string; // USDT Token 地址
  
  // 投資限制
  minInvestment: number;
  maxInvestment: number;
  
  // 費率設置
  platformFeeRate: number; // 平台手續費 (%)
  withdrawalFeeRate: number; // 提領手續費 (%)
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

  @Enum(() => TenantStatus)
  @Index()
  status: TenantStatus = TenantStatus.ACTIVE;

  @Enum(() => TenantPlan)
  @Index()
  plan: TenantPlan = TenantPlan.TRIAL;

  // 🔑 核心：分潤錢包組（全站共用）
  @Property({ type: 'json' })
  revenueWallets: RevenueWallet[] = [];
  
  // 加總應該等於 100%
  // 例如:
  // [
  //   { name: '營運錢包', address: 'TXxx...', percentage: 60 },
  //   { name: '技術錢包', address: 'TYyy...', percentage: 30 },
  //   { name: '儲備錢包', address: 'TZzz...', percentage: 10 }
  // ]

  // 虛擬貨幣配置
  @Property({ type: 'json' })
  cryptoConfig: TenantCryptoConfig = {
    supportedChains: ['tron'],
    supportedTokens: ['USDT', 'TRX'],
    investmentContractAddress: '', // 需要設定
    usdtTokenAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // TRON USDT
    minInvestment: 100,
    maxInvestment: 100000,
    platformFeeRate: 2.0, // 2%
    withdrawalFeeRate: 0.5, // 0.5%
  };

  @Property({ nullable: true })
  customDomain?: string;

  @OneToMany(() => User, user => user.tenant)
  users = new Collection<User>(this);
}
```

---

### 2️⃣ User Entity（簡化版 - 移除 KYC）

```typescript
import { Entity, Property, Enum, ManyToOne, Index, Unique } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';

export enum UserRole {
  PLATFORM_ADMIN = 'platform_admin',
  TENANT_ADMIN = 'tenant_admin',
  AGENT = 'agent',
  CUSTOMER = 'customer',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface UserSecurity {
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  lastPasswordChange?: Date;
  failedLoginAttempts: number;
  lastFailedLogin?: Date;
}

@Entity({ tableName: 'users' })
@Unique({ properties: ['email', 'tenant'] })
export class User extends BaseEntity {
  @Property()
  @Index()
  email!: string;

  @Property({ hidden: true })
  password!: string;

  @Property()
  name!: string;

  @Enum(() => UserRole)
  @Index()
  role!: UserRole;

  @Enum(() => UserStatus)
  @Index()
  status: UserStatus = UserStatus.ACTIVE;

  @ManyToOne(() => Tenant, { nullable: true })
  @Index()
  tenant?: Tenant;

  // 安全設置（可選）
  @Property({ type: 'json' })
  security: UserSecurity = {
    twoFactorEnabled: false,
    failedLoginAttempts: 0,
  };

  @Property({ nullable: true })
  lastLoginAt?: Date;

  @Property({ nullable: true })
  lastLoginIp?: string;

  @Property({ default: false })
  emailVerified: boolean = false;
}
```

---

### 3️⃣ Agent Entity（簡化版 + 錢包）

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
  rate: number; // 佣金比例 (%)
  isEnabled: boolean;
}

export interface AgentWallet {
  address: string; // TRON 地址
  chain: 'tron';
  verified: boolean; // 是否驗證過（可以簡單驗證是否為有效地址）
  verifiedAt?: Date;
  lastPaidAt?: Date; // 最後一次分潤時間
}

export interface AgentStats {
  totalCustomers: number;
  activeCustomers: number;
  totalSubAgents: number;
  totalInvestmentVolume: number; // USDT
  totalCommissionEarned: number; // USDT
  pendingCommission: number; // 待領取佣金
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
  code!: string; // 代理商代碼（邀請碼）

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

  // 🔑 核心：代理商分潤錢包
  @Property({ type: 'json', nullable: true })
  wallet?: AgentWallet;
  
  // 佣金設置
  @Property({ type: 'json' })
  commission: AgentCommission = {
    rate: 5.0,
    isEnabled: true,
  };

  @Enum(() => AgentStatus)
  @Index()
  status: AgentStatus = AgentStatus.ACTIVE;

  // 統計
  @Property({ type: 'json' })
  stats: AgentStats = {
    totalCustomers: 0,
    activeCustomers: 0,
    totalSubAgents: 0,
    totalInvestmentVolume: 0,
    totalCommissionEarned: 0,
    pendingCommission: 0,
  };

  @Property({ nullable: true, type: 'text' })
  notes?: string;
}
```

---

### 4️⃣ Customer Entity（簡化版 - 基於合約授權）

```typescript
import { Entity, Property, ManyToOne, Enum, Index } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { Agent } from './agent.entity';

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

// 客戶錢包（用於合約互動）
export interface CustomerWallet {
  address: string; // TRON 地址
  chain: 'tron';
  
  // 合約授權狀態
  isApproved: boolean; // 是否已 approve 合約
  approvedAmount: string; // 授權金額（BigNumber string）
  approvedAt?: Date;
  approvalTxHash?: string; // approve 交易 hash
  
  // 餘額追蹤（可選，也可以從鏈上讀）
  lastBalanceCheck?: Date;
  cachedUsdtBalance?: string; // 快取的 USDT 餘額
}

export interface CustomerInvestmentStats {
  totalInvested: number; // USDT
  currentBalance: number; // 當前投資餘額
  totalProfit: number; // 總收益
  totalWithdrawn: number; // 總提領
  investmentCount: number; // 投資次數
}

@Entity({ tableName: 'customers' })
export class Customer extends BaseEntity {
  @ManyToOne(() => Tenant)
  @Index()
  tenant!: Tenant;

  @ManyToOne(() => User)
  @Index()
  user!: User;

  @ManyToOne(() => Agent, { nullable: true })
  @Index()
  referralAgent?: Agent;

  @Enum(() => CustomerStatus)
  @Index()
  status: CustomerStatus = CustomerStatus.ACTIVE;

  // 🔑 核心：客戶錢包（用於合約授權）
  @Property({ type: 'json', nullable: true })
  wallet?: CustomerWallet;

  // 投資統計
  @Property({ type: 'json' })
  investmentStats: CustomerInvestmentStats = {
    totalInvested: 0,
    currentBalance: 0,
    totalProfit: 0,
    totalWithdrawn: 0,
    investmentCount: 0,
  };

  @Property({ nullable: true, type: 'text' })
  notes?: string;
}
```

---

## 🔄 分潤邏輯說明

### 場景：客戶投資 1000 USDT

```typescript
// 假設配置
const tenant = {
  revenueWallets: [
    { name: '營運', address: 'TXxx...', percentage: 60 },
    { name: '技術', address: 'TYyy...', percentage: 30 },
    { name: '儲備', address: 'TZzz...', percentage: 10 },
  ],
  cryptoConfig: {
    platformFeeRate: 2.0, // 2%
  }
};

const agent = {
  commission: {
    rate: 5.0, // 5%
    isEnabled: true,
  },
  wallet: {
    address: 'TAgent...',
  }
};

// 計算分潤
const investment = 1000; // USDT

// 1. 平台手續費
const platformFee = investment * 0.02; // 20 USDT

// 2. 代理商佣金
const agentCommission = investment * 0.05; // 50 USDT

// 3. 淨投資金額
const netInvestment = investment - platformFee - agentCommission; // 930 USDT

// 4. 分潤分配
const distributions = [
  { 
    wallet: 'TXxx...', 
    amount: platformFee * 0.60, // 12 USDT (60%)
    type: 'platform_revenue'
  },
  { 
    wallet: 'TYyy...', 
    amount: platformFee * 0.30, // 6 USDT (30%)
    type: 'platform_revenue'
  },
  { 
    wallet: 'TZzz...', 
    amount: platformFee * 0.10, // 2 USDT (10%)
    type: 'platform_revenue'
  },
  { 
    wallet: 'TAgent...', 
    amount: agentCommission, // 50 USDT
    type: 'agent_commission'
  },
];
```

---

## 📦 Migration vs Entity - 正確順序

### ⭐ 推薦流程：**先 Entity，後 Migration**

```bash
步驟順序:
1. ✅ 先創建 Entity 檔案
2. ✅ 再生成 Migration
3. ✅ 執行 Migration
```

### 原因：

| 方式 | 優點 | 缺點 |
|------|------|------|
| **Entity → Migration** ⭐ | • 自動生成<br>• 不會遺漏<br>• 類型安全 | 無 |
| Migration → Entity | • 完全控制 | • 手動維護<br>• 容易出錯<br>• 同步困難 |

---

## 🚀 實作步驟

### 步驟 1：創建 Entity 檔案

```bash
packages/database/src/entities/
  ├── base.entity.ts          # ← 已存在
  ├── tenant.entity.ts        # ← 更新（加入 revenueWallets）
  ├── user.entity.ts          # ← 更新（移除 KYC）
  ├── agent.entity.ts         # ← 更新（加入 wallet）
  └── customer.entity.ts      # ← 更新（加入 wallet + approve）
```

### 步驟 2：生成 Migration

```bash
# 進入 platform-api
cd apps/platform-api

# 生成 migration（會自動對比 Entity）
npx mikro-orm migration:create --name init-crypto-system

# 生成的檔案會在：
# apps/platform-api/src/migrations/Migration20241128_init_crypto_system.ts
```

### 步驟 3：檢查 Migration

```typescript
// 自動生成的 migration 會包含：
export class Migration20241128InitCryptoSystem extends Migration {
  async up(): Promise<void> {
    // 創建所有表
    this.addSql('CREATE TABLE tenants ...');
    this.addSql('CREATE TABLE users ...');
    this.addSql('CREATE TABLE agents ...');
    this.addSql('CREATE TABLE customers ...');
    
    // 創建索引
    this.addSql('CREATE INDEX ...');
  }

  async down(): Promise<void> {
    // 回滾操作
    this.addSql('DROP TABLE customers');
    this.addSql('DROP TABLE agents');
    this.addSql('DROP TABLE users');
    this.addSql('DROP TABLE tenants');
  }
}
```

### 步驟 4：執行 Migration

```bash
# 檢查待執行的 migration
npx mikro-orm migration:pending

# 執行 migration
npx mikro-orm migration:up

# 如果需要回滾
npx mikro-orm migration:down
```

---

## 📋 完整實作 Checklist

### Phase 1: Entity 設計 ✅（現在）

- [ ] 1. 更新 `tenant.entity.ts`（加入 revenueWallets）
- [ ] 2. 更新 `user.entity.ts`（移除 KYC）
- [ ] 3. 更新 `agent.entity.ts`（加入 wallet）
- [ ] 4. 更新 `customer.entity.ts`（加入 wallet + approve）

### Phase 2: Migration 生成

- [ ] 5. 生成初始 migration
- [ ] 6. 檢查 migration 內容
- [ ] 7. 執行 migration

### Phase 3: 測試

- [ ] 8. 測試創建租戶
- [ ] 9. 測試創建用戶
- [ ] 10. 測試代理商錢包
- [ ] 11. 測試客戶錢包授權

---

## 🔑 關鍵欄位總結

### Tenant（租戶）
```yaml
新增:
  ✅ revenueWallets[] - 分潤錢包組
    - address (TRON 地址)
    - percentage (比例 %)
    - name (名稱)

  ✅ cryptoConfig.investmentContractAddress - 投資合約地址
  ✅ cryptoConfig.usdtTokenAddress - USDT 代幣地址
  ✅ cryptoConfig.platformFeeRate - 平台手續費
```

### Agent（代理）
```yaml
新增:
  ✅ wallet.address - 代理商分潤錢包
  ✅ wallet.verified - 驗證狀態
  ✅ stats.pendingCommission - 待領取佣金
```

### Customer（客戶）
```yaml
新增:
  ✅ wallet.address - 客戶錢包地址
  ✅ wallet.isApproved - 合約授權狀態
  ✅ wallet.approvedAmount - 授權金額
  ✅ wallet.approvalTxHash - 授權交易 hash
```

移除:
```yaml
刪除:
  ❌ kyc - KYC 相關欄位
  ❌ amlCheck - AML 檢查
  ❌ limits - 限額（由合約控制）
```

---

## ✅ 下一步行動

**你現在應該做：**

1. **我幫你創建/更新 Entity 檔案** 🔨
   - 實際的 `.entity.ts` 檔案
   - 包含所有新增的欄位

2. **然後生成 Migration** 📝
   - 自動產生資料庫 schema

3. **執行 Migration** 🚀
   - 創建實際的資料庫表

**要我開始創建 Entity 檔案嗎？** 😊
