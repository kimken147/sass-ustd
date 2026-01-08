# 虛擬貨幣投資系統 Entity 設計

## 🎯 專案說明

**系統類型**：幫助客戶使用虛擬貨幣（TRON、USDT）投資的多租戶 SaaS 平台

**角色層級**：
```
Platform Admin（平台管理員）
    └─ Tenant（租戶）
        └─ Tenant Admin（租戶管理員）
            └─ Agent（代理商 - 無限層級）
                └─ Customer（投資客戶）
```

---

## 🤔 核心問題：統一 User Table 還是分開？

### 答案：**分開設計** ⭐ 推薦

**原因**：

1. ✅ **角色差異太大**
   - Tenant（租戶）：組織實體，有計費、白標
   - Agent（代理商）：有佣金、下線結構
   - Customer（投資客戶）：有投資組合、錢包地址

2. ✅ **欄位差異大**
   - Tenant 不需要 walletAddress
   - Customer 不需要 commissionRate
   - Agent 不需要 investmentLimit

3. ✅ **查詢效能更好**
   - 單一目的的表更快
   - 索引更有效

4. ✅ **程式碼更清晰**
   - 明確的類型定義
   - 避免 null 欄位過多

5. ✅ **符合 DDD（領域驅動設計）**
   - 每個角色是不同的領域實體
   - 有各自的業務邏輯

---

## 📊 推薦架構：4 個分開的 Entity

```
┌─────────────┐
│   Tenant    │  租戶（組織）
└─────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐
│    User     │  用戶（通用認證）
└─────────────┘
       │
    ┌──┴──┬──────┐
    │     │      │
  1:0/1  1:0/1  1:0/1
    │     │      │
    ▼     ▼      ▼
┌───────┐ ┌─────────┐ ┌──────────┐
│ Admin │ │  Agent  │ │ Customer │
└───────┘ └─────────┘ └──────────┘
```

---

## 🗄️ Entity 詳細設計

### 1️⃣ Tenant Entity（租戶）

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

export interface TenantBranding {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  companyName?: string;
  contactEmail?: string;
  supportUrl?: string;
}

export interface TenantFeatures {
  agents: boolean;
  multilevelAgents: boolean;
  whiteLabel: boolean;
  customDomain: boolean;
  apiAccess: boolean;
  advancedReporting: boolean;
}

export interface TenantLimits {
  maxAdmins: number;
  maxAgents: number;
  maxCustomers: number;
  maxMonthlyVolume: number; // USDT
}

export interface TenantCryptoConfig {
  supportedChains: string[]; // ['tron', 'ethereum', ...]
  supportedTokens: string[]; // ['USDT', 'USDC', 'TRX', ...]
  minInvestment: number;
  maxInvestment: number;
  withdrawalFeeRate: number; // %
  defaultStakingRate: number; // %
}

@Entity({ tableName: 'tenants' })
export class Tenant extends BaseEntity {
  @Property()
  @Unique()
  @Index()
  name!: string; // 租戶名稱

  @Property()
  @Unique()
  @Index()
  slug!: string; // URL 友好名稱

  @Property()
  @Unique()
  @Index()
  email!: string; // 租戶聯絡郵箱

  @Enum(() => TenantStatus)
  @Index()
  status: TenantStatus = TenantStatus.ACTIVE;

  @Enum(() => TenantPlan)
  @Index()
  plan: TenantPlan = TenantPlan.TRIAL;

  @Property({ nullable: true })
  trialEndsAt?: Date;

  // 白標配置
  @Property({ type: 'json', nullable: true })
  branding?: TenantBranding;

  // 功能開關
  @Property({ type: 'json' })
  features: TenantFeatures = {
    agents: true,
    multilevelAgents: true,
    whiteLabel: false,
    customDomain: false,
    apiAccess: false,
    advancedReporting: false,
  };

  // 限制設置
  @Property({ type: 'json' })
  limits: TenantLimits = {
    maxAdmins: 5,
    maxAgents: 100,
    maxCustomers: 1000,
    maxMonthlyVolume: 100000, // 10萬 USDT
  };

  // 虛擬貨幣配置
  @Property({ type: 'json' })
  cryptoConfig: TenantCryptoConfig = {
    supportedChains: ['tron'],
    supportedTokens: ['USDT', 'TRX'],
    minInvestment: 100,
    maxInvestment: 100000,
    withdrawalFeeRate: 0.5,
    defaultStakingRate: 8.0,
  };

  @Property({ nullable: true })
  customDomain?: string; // 白標域名

  @Property({ nullable: true })
  apiUrl?: string; // 租戶 API URL

  // 關聯
  @OneToMany(() => User, user => user.tenant)
  users!: User[];
}
```

---

### 2️⃣ User Entity（通用認證）

```typescript
import { Entity, Property, Enum, ManyToOne, Index, Unique } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';

export enum UserRole {
  PLATFORM_ADMIN = 'platform_admin', // 平台管理員
  TENANT_ADMIN = 'tenant_admin',     // 租戶管理員
  AGENT = 'agent',                   // 代理商
  CUSTOMER = 'customer',             // 投資客戶
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

export enum KYCStatus {
  NOT_SUBMITTED = 'not_submitted',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  language?: string;
  timezone?: string;
}

export interface UserSecurity {
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  lastPasswordChange?: Date;
  failedLoginAttempts: number;
  lastFailedLogin?: Date;
  ipWhitelist?: string[];
}

export interface UserKYC {
  status: KYCStatus;
  documentType?: string; // 'passport' | 'id_card' | 'driver_license'
  documentNumber?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: number; // User ID
  rejectionReason?: string;
}

@Entity({ tableName: 'users' })
@Unique({ properties: ['email', 'tenant'] })
export class User extends BaseEntity {
  // 基本資訊
  @Property()
  @Index()
  email!: string;

  @Property({ hidden: true })
  password!: string; // bcrypt hashed

  @Property()
  name!: string;

  // 角色與狀態
  @Enum(() => UserRole)
  @Index()
  role!: UserRole;

  @Enum(() => UserStatus)
  @Index()
  status: UserStatus = UserStatus.PENDING_VERIFICATION;

  // 租戶關聯（Platform Admin 沒有 tenant）
  @ManyToOne(() => Tenant, { nullable: true })
  @Index()
  tenant?: Tenant;

  // 個人資料
  @Property({ type: 'json', nullable: true })
  profile?: UserProfile;

  // 安全設置
  @Property({ type: 'json' })
  security: UserSecurity = {
    twoFactorEnabled: false,
    failedLoginAttempts: 0,
  };

  // KYC 資訊
  @Property({ type: 'json' })
  kyc: UserKYC = {
    status: KYCStatus.NOT_SUBMITTED,
  };

  // 登入資訊
  @Property({ nullable: true })
  lastLoginAt?: Date;

  @Property({ nullable: true })
  lastLoginIp?: string;

  // Email 驗證
  @Property({ default: false })
  emailVerified: boolean = false;

  @Property({ nullable: true })
  emailVerifiedAt?: Date;

  @Property({ nullable: true })
  emailVerificationToken?: string;

  // 密碼重設
  @Property({ nullable: true })
  passwordResetToken?: string;

  @Property({ nullable: true })
  passwordResetExpiresAt?: Date;
}
```

---

### 3️⃣ Agent Entity（代理商 - 無限層級）

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

export enum CommissionType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  TIERED = 'tiered',
}

export interface AgentCommission {
  rate: number; // 佣金比例 (%) 或固定金額
  type: CommissionType;
  tierRates?: { // 階梯式佣金
    min: number;
    max: number;
    rate: number;
  }[];
}

export interface AgentStats {
  totalCustomers: number;
  activeCustomers: number;
  totalSubAgents: number;
  totalInvestmentVolume: number; // USDT
  totalCommissionEarned: number; // USDT
  thisMonthVolume: number;
  thisMonthCommission: number;
}

export interface AgentBankInfo {
  accountName?: string;
  bankName?: string;
  accountNumber?: string;
  swiftCode?: string;
  iban?: string;
}

@Entity({ tableName: 'agents' })
@Unique({ properties: ['tenant', 'code'] })
export class Agent extends BaseEntity {
  @ManyToOne(() => Tenant)
  @Index()
  tenant!: Tenant;

  @ManyToOne(() => User)
  @Index()
  user!: User; // 關聯到 User 表

  @Property()
  name!: string;

  @Property()
  @Index()
  code!: string; // 代理商代碼（邀請碼）

  // 無限層級代理結構
  @ManyToOne(() => Agent, { nullable: true })
  @Index()
  parentAgent?: Agent;

  @Property({ default: 'root' })
  @Index()
  path: string = 'root'; // 例如: "root/1/5/12"

  @Property({ default: 0 })
  @Index()
  level: number = 0; // 0 = 頂級, 1 = 二級...

  // 佣金設置
  @Property({ type: 'json' })
  commission: AgentCommission = {
    rate: 5.0,
    type: CommissionType.PERCENTAGE,
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
    totalInvestmentVolume: 0,
    totalCommissionEarned: 0,
    thisMonthVolume: 0,
    thisMonthCommission: 0,
  };

  // 銀行資訊（用於提領佣金）
  @Property({ type: 'json', nullable: true })
  bankInfo?: AgentBankInfo;

  // 備註
  @Property({ nullable: true, type: 'text' })
  notes?: string;
}
```

---

### 4️⃣ Customer Entity（投資客戶）

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
  BLACKLISTED = 'blacklisted',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

export interface CustomerWallets {
  tron?: {
    address: string;
    verified: boolean;
    verifiedAt?: Date;
  };
  ethereum?: {
    address: string;
    verified: boolean;
    verifiedAt?: Date;
  };
  // 可擴展其他鏈
}

export interface CustomerInvestmentProfile {
  totalInvested: number; // USDT
  currentBalance: number; // USDT
  totalProfit: number; // USDT
  totalWithdrawn: number; // USDT
  totalDeposit: number; // USDT
  investmentCount: number;
  averageReturn: number; // %
  riskLevel: RiskLevel;
}

export interface CustomerLimits {
  dailyDepositLimit: number;
  dailyWithdrawalLimit: number;
  monthlyInvestmentLimit: number;
  requiresApprovalAbove: number; // 需要審核的金額
}

export interface CustomerPreferences {
  currency: string; // 'USD' | 'TWD' | 'CNY'
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  autoReinvest: boolean;
  defaultStakingPlan?: string;
}

@Entity({ tableName: 'customers' })
export class Customer extends BaseEntity {
  @ManyToOne(() => Tenant)
  @Index()
  tenant!: Tenant;

  @ManyToOne(() => User)
  @Index()
  user!: User; // 關聯到 User 表

  // 推薦代理
  @ManyToOne(() => Agent, { nullable: true })
  @Index()
  referralAgent?: Agent;

  @Enum(() => CustomerStatus)
  @Index()
  status: CustomerStatus = CustomerStatus.ACTIVE;

  // 錢包地址
  @Property({ type: 'json' })
  wallets: CustomerWallets = {};

  // 投資檔案
  @Property({ type: 'json' })
  investmentProfile: CustomerInvestmentProfile = {
    totalInvested: 0,
    currentBalance: 0,
    totalProfit: 0,
    totalWithdrawn: 0,
    totalDeposit: 0,
    investmentCount: 0,
    averageReturn: 0,
    riskLevel: RiskLevel.LOW,
  };

  // 限制設置
  @Property({ type: 'json' })
  limits: CustomerLimits = {
    dailyDepositLimit: 10000,
    dailyWithdrawalLimit: 5000,
    monthlyInvestmentLimit: 50000,
    requiresApprovalAbove: 10000,
  };

  // 偏好設置
  @Property({ type: 'json' })
  preferences: CustomerPreferences = {
    currency: 'USD',
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
    autoReinvest: false,
  };

  // 風險評估
  @Property({ nullable: true })
  lastRiskAssessmentAt?: Date;

  // VIP 等級
  @Property({ default: 0 })
  @Index()
  vipLevel: number = 0; // 0-5

  // 備註
  @Property({ nullable: true, type: 'text' })
  notes?: string;
}
```

---

## 📋 完整欄位清單

### Tenant（租戶）必要欄位：
```yaml
基本:
  - name (名稱)
  - slug (URL 名稱)
  - email (聯絡郵箱)
  - status (狀態)
  - plan (計劃)

白標:
  - branding (品牌配置)
  - customDomain (自訂域名)

功能:
  - features (功能開關)
  - limits (限制設置)

虛擬貨幣:
  - cryptoConfig (鏈、代幣、費率配置)
```

### User（用戶）必要欄位：
```yaml
認證:
  - email (郵箱)
  - password (密碼 - bcrypt)
  - role (角色)

安全:
  - security.twoFactorEnabled (2FA)
  - security.failedLoginAttempts (失敗次數)

KYC:
  - kyc.status (KYC 狀態)
  - kyc.documentType (證件類型)
  - kyc.documentUrls (證件圖片)

關聯:
  - tenant (所屬租戶)
```

### Agent（代理）必要欄位：
```yaml
基本:
  - tenant (租戶)
  - user (用戶)
  - name (名稱)
  - code (代理碼)

層級:
  - parentAgent (父代理)
  - path (路徑)
  - level (層級)

佣金:
  - commission.rate (比例)
  - commission.type (類型)

統計:
  - stats (所有統計數據)

銀行:
  - bankInfo (提領資訊)
```

### Customer（客戶）必要欄位：
```yaml
基本:
  - tenant (租戶)
  - user (用戶)
  - referralAgent (推薦代理)
  - status (狀態)

錢包:
  - wallets.tron.address (TRON 地址)
  - wallets.tron.verified (驗證狀態)

投資:
  - investmentProfile.totalInvested (總投資)
  - investmentProfile.currentBalance (當前餘額)
  - investmentProfile.totalProfit (總收益)

限制:
  - limits (各種限制)

偏好:
  - preferences (設定)
```

---

## 🔐 額外建議欄位

### 1. 安全相關

#### User 表加入：
```typescript
// IP 白名單（針對高風險操作）
@Property({ type: 'json', nullable: true })
ipWhitelist?: string[];

// 設備指紋
@Property({ type: 'json', nullable: true })
trustedDevices?: {
  deviceId: string;
  deviceName: string;
  lastUsed: Date;
}[];

// API Key（給代理或客戶用）
@Property({ nullable: true })
apiKey?: string;

@Property({ nullable: true })
apiKeyExpiresAt?: Date;
```

---

### 2. 合規相關

#### Customer 表加入：
```typescript
// AML (反洗錢) 檢查
@Property({ type: 'json' })
amlCheck: {
  status: 'pending' | 'passed' | 'failed';
  lastCheckedAt?: Date;
  riskScore?: number; // 0-100
  flags?: string[];
};

// 交易監控標記
@Property({ type: 'json' })
transactionFlags: {
  suspiciousActivity: boolean;
  highFrequencyTrading: boolean;
  unusualPatterns: boolean;
  lastFlaggedAt?: Date;
};
```

---

### 3. 稽核追蹤

#### 所有表加入（透過 Base Entity）：
```typescript
// 軟刪除
@Property({ nullable: true })
deletedAt?: Date;

@ManyToOne(() => User, { nullable: true })
deletedBy?: User;

// 創建/更新追蹤
@ManyToOne(() => User, { nullable: true })
createdBy?: User;

@ManyToOne(() => User, { nullable: true })
updatedBy?: User;
```

---

## ✅ 總結建議

### 🏆 推薦架構：

```
1. ✅ 分開 4 個 Entity (Tenant, User, Agent, Customer)
2. ✅ User 作為通用認證層
3. ✅ Agent 和 Customer 關聯到 User
4. ✅ 使用 role 區分角色
```

### 必要欄位優先級：

#### P0（立即需要）：
```
User:
  - email, password, role, status
  - tenant (關聯)
  - kyc.status

Agent:
  - tenant, user, code
  - parentAgent, path, level
  - commission

Customer:
  - tenant, user
  - wallets.tron.address
  - referralAgent
  - investmentProfile
```

#### P1（第二階段）：
```
User:
  - security (2FA)
  - profile

Agent:
  - stats
  - bankInfo

Customer:
  - limits
  - preferences
  - amlCheck
```

#### P2（未來優化）：
```
- API Key
- Device Tracking
- Advanced AML
- IP Whitelist
```

---

**這個架構設計完成了！接下來要實作哪一個 Entity？** 🚀

**或者要我繼續設計其他相關的 Entity（如 Investment, Transaction, Wallet 等）？** 💎
