/**
 * 代理分潤相關類型定義
 * 用於 tenant-api 和 tenant-admin 之間的資料交換
 */

/**
 * 代理分潤類型
 */
export enum CommissionPayoutType {
  SELF = "self", // 自己保留的佣金
  FROM_DOWNLINE = "from_downline", // 從下級收到的佣金
}

/**
 * 代理分潤狀態
 */
export enum CommissionPayoutStatus {
  PENDING = "pending", // 待發放
  PROCESSING = "processing", // 處理中
  COMPLETED = "completed", // 已完成
  FAILED = "failed", // 失敗
}

/**
 * 代理分潤查詢參數
 */
export interface CommissionPayoutQuery {
  startDate?: string; // 開始時間（ISO 8601）
  endDate?: string; // 結束時間（ISO 8601）
  page?: number; // 頁碼
  limit?: number; // 每頁數量
}

/**
 * 代理分潤項目
 */
export interface CommissionPayoutItem {
  id: number; // 交易 ID
  transactionTime: Date; // 交易時間
  customerId: number; // 會員 ID
  customerName: string; // 會員名稱
  memberWallet: string; // 會員錢包地址
  agentId: number; // 代理 ID
  agentName: string; // 代理名稱
  recipient: string; // 接收者類型（例如：D代理1 張三）
  recipientWallet: string; // 接收者錢包地址
  amount: string; // 佣金金額（USDT）
  originalInvestmentAmount: string; // 原始投資金額（USDT）
  ratio: number; // 佣金比例（%）
  commissionRate: number; // 佣金率（%）
  type: CommissionPayoutType; // 佣金類型
  status: CommissionPayoutStatus; // 狀態
  txHash?: string; // 交易 Hash
  isFirstPayout: boolean; // 是否為首次分潤
  createdAt: Date; // 創建時間
}

/**
 * 代理分潤列表響應
 */
export interface CommissionPayoutResponse {
  items: CommissionPayoutItem[]; // 代理分潤列表
  total: number; // 總數
  page: number; // 當前頁碼
  limit: number; // 每頁數量
  totalPages: number; // 總頁數
}
