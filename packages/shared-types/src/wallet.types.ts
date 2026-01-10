/**
 * 錢包相關類型定義
 * 用於 platform-api 和 platform-admin 之間的資料交換
 * 
 * 注意：SystemWalletType, SystemWalletStatus, SystemWalletChain 的 enum 定義
 * 在 @saas-platform/database 中，這裡重新匯出以保持一致性
 */

// 從 database 重新匯出 enum（如果需要的話，也可以直接從 database 導入）
// 為了避免循環依賴，這裡重新定義，但值必須與 database 保持一致
export enum SystemWalletType {
  CONTRACT_EXECUTION = "contract_execution", // 執行合約
  REVENUE_DISTRIBUTION = "revenue_distribution", // 收款
}

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

/**
 * 系統錢包
 */
export interface SystemWallet {
  id: number;
  name: string;
  address: string;
  chain: SystemWalletChain;
  type: SystemWalletType;
  status: SystemWalletStatus;
  verified: boolean;
  verifiedAt?: Date;
  verificationTxHash?: string;
  totalRevenue: string;
  description?: string;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 系統錢包分配
 */
export interface SystemWalletAssignment {
  walletId: number;
  name: string;
  address: string;
  percentage: number;
}
