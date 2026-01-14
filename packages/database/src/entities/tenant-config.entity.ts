import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

/**
 * 租戶分潤錢包配置（從 Platform DB 同步）
 */
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

/**
 * 系統商錢包指派配置（從 Platform DB 同步）
 */
export interface SystemWalletAssignment {
  walletId: number; // 系統商錢包 ID（用於關聯和同步）
  address: string; // 錢包地址（複製，供 tenant-api 使用）
  name: string; // 錢包名稱（複製）
  chain: string; // 區塊鏈（複製）
  percentage: number; // 分潤比例（整數，%）
  syncedAt: Date; // 同步時間（用於追蹤資料新鮮度）
}

/**
 * 租戶虛擬貨幣配置（從 Platform DB 同步）
 */
export interface TenantCryptoConfig {
  supportedChains: string[]; // ['tron']
  supportedTokens: string[]; // ['USDT', 'TRX']

  // 合約地址
  investmentContractAddress: string; // 投資合約地址
  usdtTokenAddress: string; // USDT Token 地址

  // 🔑 執行合約的錢包（用於調用 transferFrom）
  executionWalletId?: number;
  executionWalletAddress?: string;
  executionWalletPrivateKey?: string; // 已加密

  // 投資限制
  minInvestment: number;
  maxInvestment: number;

  // 費率設置（投資金額 100% 分配）
  tenantRevenueRate: number; // 租戶收入比例 (%)
  agentCommissionRate: number; // 代理佣金總比例 (%)
}

/**
 * 白標配置（從 Platform DB 同步）
 */
export interface TenantBranding {
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  companyName?: string;
  contactEmail?: string;
  supportUrl?: string;
}

/**
 * TenantConfig Entity
 *
 * 專用於 Tenant DB 的租戶配置表
 * 每個租戶資料庫只有一筆記錄（id = 1）
 *
 * 這個表存放從 Platform DB 同步過來的租戶配置，
 * 讓 tenant-api 可以直接讀取，不需要連接 Platform DB
 */
@Entity({ tableName: "tenant_config" })
export class TenantConfig {
  /**
   * 主鍵，永遠只有一筆（id = 1）
   */
  @PrimaryKey()
  id: number = 1;

  /**
   * 租戶 slug（用於識別，與 Platform DB 同步）
   */
  @Property()
  slug!: string;

  /**
   * 租戶名稱
   */
  @Property()
  name!: string;

  /**
   * 系統費率（由總後台設定）
   */
  @Property({ type: "decimal", precision: 5, scale: 2 })
  systemFeeRate: number = 10.0;

  /**
   * 虛擬貨幣配置
   */
  @Property({ type: "json" })
  cryptoConfig: TenantCryptoConfig = {
    supportedChains: ["tron"],
    supportedTokens: ["USDT", "TRX"],
    investmentContractAddress: "",
    usdtTokenAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    minInvestment: 100,
    maxInvestment: 100000,
    tenantRevenueRate: 60.0,
    agentCommissionRate: 30.0,
  };

  /**
   * 租戶分潤錢包組
   * 所有 isActive=true 的錢包 percentage 加總必須 = 100
   */
  @Property({ type: "json" })
  revenueWallets: RevenueWallet[] = [];

  /**
   * 系統商錢包指派（用於分潤，比例總和必須 = 100%）
   */
  @Property({ type: "json", nullable: true })
  systemWallets?: SystemWalletAssignment[];

  /**
   * 白標配置
   */
  @Property({ type: "json", nullable: true })
  branding?: TenantBranding;

  /**
   * 自定義域名
   */
  @Property({ nullable: true })
  customDomain?: string;

  /**
   * 自定義 URL
   */
  @Property({ nullable: true })
  customUrl?: string;

  /**
   * 創建時間
   */
  @Property()
  createdAt: Date = new Date();

  /**
   * 更新時間
   */
  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  /**
   * 最後從 Platform DB 同步的時間
   */
  @Property({ nullable: true })
  lastSyncedAt?: Date;
}
