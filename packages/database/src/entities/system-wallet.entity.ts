import {
  Entity,
  Property,
  Enum,
  Index,
  Unique,
} from "@mikro-orm/core";
import { BaseEntity } from "./base.entity";

export enum SystemWalletStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

export enum SystemWalletChain {
  TRON = "tron",
  ETHEREUM = "ethereum",
  BSC = "bsc",
}

export enum SystemWalletType {
  CONTRACT_EXECUTION = "contract_execution", // 執行合約的錢包
  REVENUE_DISTRIBUTION = "revenue_distribution", // 分潤的錢包
}

@Entity({ tableName: "system_wallets" })
export class SystemWallet extends BaseEntity {
  @Property()
  @Index()
  name!: string; // 錢包名稱，例如: "主系統錢包"、"備用錢包"

  @Property()
  @Unique()
  @Index()
  address!: string; // 錢包地址

  @Enum(() => SystemWalletChain)
  @Index()
  chain: SystemWalletChain = SystemWalletChain.TRON;

  @Enum(() => SystemWalletType)
  @Index()
  type!: SystemWalletType; // 錢包類型：執行合約 或 分潤

  @Enum(() => SystemWalletStatus)
  @Index()
  status: SystemWalletStatus = SystemWalletStatus.ACTIVE;

  @Property({ default: false })
  verified: boolean = false; // 是否已驗證

  @Property({ nullable: true })
  verifiedAt?: Date; // 驗證時間

  @Property({ nullable: true })
  verificationTxHash?: string; // 驗證交易 hash

  @Property({ type: "decimal", precision: 20, scale: 6, default: "0" })
  totalRevenue: string = "0"; // 累計系統費收入（USDT）

  @Property({ nullable: true, type: "text" })
  description?: string; // 備註說明

  @Property({ nullable: true })
  lastUsedAt?: Date; // 最後使用時間

  // 🔑 執行合約錢包的私鑰（僅 CONTRACT_EXECUTION 類型需要，加密存儲）
  @Property({ nullable: true, hidden: true })
  privateKey?: string; // 加密後的私鑰
}
