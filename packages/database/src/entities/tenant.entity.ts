import { Entity, Property, Enum, Index, Unique, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

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
  id: string;                    // UUID
  name: string;                  // 例如: "營運錢包"
  address: string;               // TRON 地址
  chain: 'tron';
  percentage: number;            // 分潤比例 (%)
  isActive: boolean;
  verified: boolean;             // 第一次分潤時驗證
  verifiedAt?: Date;
  verificationTxHash?: string;   // 驗證交易 hash
  totalPaidAmount: number;       // 累計已分潤金額
  lastPaidAt?: Date;
  description?: string;
}

export interface TenantCryptoConfig {
  supportedChains: string[];           // ['tron']
  supportedTokens: string[];           // ['USDT', 'TRX']
  
  // 合約地址
  investmentContractAddress: string;   // 投資合約地址
  usdtTokenAddress: string;            // USDT Token 地址
  
  // 投資限制
  minInvestment: number;
  maxInvestment: number;
  
  // 費率設置（投資金額 100% 分配）
  // systemFeeRate (在 Tenant 層級) + tenantRevenueRate + agentCommissionRate = 100%
  tenantRevenueRate: number;           // 租戶收入比例 (%)
  agentCommissionRate: number;         // 代理佣金總比例 (%)
}

// 白標配置
export interface TenantBranding {
  logo?: string;                 // Logo URL
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

  // 🔑 自訂 URL（由總後台設定）
  @Property({ nullable: true })
  @Unique()
  customUrl?: string;

  // 🔑 Logo 和品牌配置（由總後台設定）
  @Property({ type: 'json', nullable: true })
  branding?: TenantBranding;

  @Enum(() => TenantStatus)
  @Index()
  status: TenantStatus = TenantStatus.ACTIVE;

  @Enum(() => TenantPlan)
  @Index()
  plan: TenantPlan = TenantPlan.TRIAL;

  @Property({ nullable: true })
  trialEndsAt?: Date;

  // 🔑 核心：租戶分潤錢包組（即時生效 + 第一次分潤驗證）
  // 所有 isActive=true 的錢包 percentage 加總必須 = 100
  @Property({ type: 'json' })
  revenueWallets: RevenueWallet[] = [];

  // 🔑 系統費率（由總後台設定）
  @Property({ type: 'decimal', precision: 5, scale: 2 })
  systemFeeRate: number = 10.0;  // 預設 10%

  // 虛擬貨幣配置
  @Property({ type: 'json' })
  cryptoConfig: TenantCryptoConfig = {
    supportedChains: ['tron'],
    supportedTokens: ['USDT', 'TRX'],
    investmentContractAddress: '',
    usdtTokenAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // TRON USDT
    minInvestment: 100,
    maxInvestment: 100000,
    tenantRevenueRate: 60.0,      // 租戶收入 60%
    agentCommissionRate: 30.0,    // 代理佣金 30%
    // 系統費 10% + 租戶 60% + 代理 30% = 100%
  };

  @Property({ nullable: true })
  customDomain?: string;

  @OneToMany(() => User, user => user.tenant)
  users = new Collection<User>(this);
}
