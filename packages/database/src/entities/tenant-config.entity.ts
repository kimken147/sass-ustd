import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import {
  RevenueWallet,
  SystemWalletAssignment,
  TenantBranding,
  TenantCryptoConfig,
} from "./tenant.entity";

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
   * 虚拟货币配置
   */
  @Property({ type: "json" })
  cryptoConfig: TenantCryptoConfig = {
    supportedChains: ["tron"],
    supportedTokens: ["USDT", "TRX"],
    investmentContractAddress: "",
    usdtTokenAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    minInvestment: 100,
    maxInvestment: 100000,
    tenantRevenueRate: 60.0, // 租戶收入 60%
    agentCommissionRate: 30.0, // 代理佣金 30%
    // 系統費 10% + 租戶 60% + 代理 30% = 100%
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
