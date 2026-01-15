import {
  Entity,
  Property,
  Enum,
  Index,
  Unique,
  OneToMany,
  Collection,
} from "@mikro-orm/core";
import { BaseEntity } from "./base.entity";
import { PlatformUser } from "./user-platform.entity";

export enum TenantStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  INACTIVE = "inactive",
}

export enum TenantPlan {
  TRIAL = "trial",
  BASIC = "basic",
  PRO = "pro",
  ENTERPRISE = "enterprise",
}

// 租戶分潤錢包配置
export interface RevenueWallet {
  id: string; // UUID
  name: string; // 例如: "營運錢包"
  address: string; // TRON 地址
  chain: "tron";
  percentage: number; // 分潤比例 (%)
  isActive: boolean;
  verified: boolean; // 第一次分潤時驗證
  verifiedAt?: Date;
  verificationTxHash?: string; // 驗證交易 hash
  totalPaidAmount: number; // 累計已分潤金額
  lastPaidAt?: Date;
  description?: string;
}

// 系統商錢包指派配置（用於分潤）
// 注意：此資訊會複製到 Tenant DB，讓 tenant-api 可以直接讀取
export interface SystemWalletAssignment {
  walletId: number; // 系統商錢包 ID（用於關聯和同步）
  address: string; // 錢包地址（複製，供 tenant-api 使用）
  name: string; // 錢包名稱（複製）
  chain: string; // 區塊鏈（複製）
  percentage: number; // 分潤比例（整數，%）
  syncedAt: Date; // 同步時間（用於追蹤資料新鮮度）
}

export interface TenantCryptoConfig {
  supportedChains: string[]; // ['tron']
  supportedTokens: string[]; // ['USDT', 'TRX']

  // 合約地址
  investmentContractAddress: string; // 投資合約地址
  usdtTokenAddress: string; // USDT Token 地址

  // 🔑 執行合約的錢包（用於調用 transferFrom）
  executionWalletId?: number; // 執行合約的錢包 ID（引用 SystemWallet，類型為 CONTRACT_EXECUTION）
  executionWalletAddress?: string; // 執行合約的錢包地址（從 SystemWallet 複製，供 tenant-api 使用）
  executionWalletPrivateKey?: string; // 執行合約的錢包私鑰（從 SystemWallet 複製，已加密，供 tenant-api 使用）

  // 投資限制
  minInvestment: number;
  maxInvestment: number;

  // 費率設置（投資金額 100% 分配）
  // systemFeeRate (在 Tenant 層級) + tenantRevenueRate + agentCommissionRate = 100%
  tenantRevenueRate: number; // 租戶收入比例 (%)
  agentCommissionRate: number; // 代理佣金總比例 (%)
}

// 白標配置
export interface TenantBranding {
  logo?: string; // Logo URL
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  companyName?: string;
  contactEmail?: string;
  supportUrl?: string;
}

@Entity({ tableName: "tenants" })
export class Tenant extends BaseEntity {
  @Property()
  @Unique()
  @Index()
  name!: string;

  @Property()
  @Unique()
  @Index()
  slug!: string;

  @Property({ nullable: true })
  @Unique()
  @Index()
  email?: string;

  // 🔑 自訂 URL（由總後台設定）
  @Property({ nullable: true })
  @Unique()
  customUrl?: string;

  // 🔑 Logo 和品牌配置（由總後台設定）
  @Property({ type: "json", nullable: true })
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
  @Property({ type: "json" })
  revenueWallets: RevenueWallet[] = [];

  // 🔑 系統費率（由總後台設定）
  @Property({ type: "decimal", precision: 5, scale: 2 })
  systemFeeRate: number = 10.0; // 預設 10%

  // 🔑 系統商錢包指派（用於分潤，比例總和必須 = 100%）
  @Property({ type: "json", nullable: true })
  systemWallets?: SystemWalletAssignment[];

  // 虛擬貨幣配置
  @Property({ type: "json" })
  cryptoConfig: TenantCryptoConfig = {
    supportedChains: ["tron"],
    supportedTokens: ["USDT", "TRX"],
    investmentContractAddress: "",
    usdtTokenAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // TRON USDT
    minInvestment: 100,
    maxInvestment: 100000,
    tenantRevenueRate: 60.0, // 租戶收入 60%
    agentCommissionRate: 30.0, // 代理佣金 30%
    // 系統費 10% + 租戶 60% + 代理 30% = 100%
  };

  @Property({ nullable: true })
  @Unique()
  @Index()
  customDomain?: string;

  @OneToMany(() => PlatformUser, (user) => user.tenant)
  users = new Collection<PlatformUser>(this);
}
