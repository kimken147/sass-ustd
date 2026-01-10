/**
 * 站長收益分配相關類型定義
 * 用於 tenant-api 和 tenant-admin 之間的資料交換
 */

/**
 * 站長收益分配查詢參數
 */
export interface RevenueDistributionQuery {
  startDate?: string; // 開始時間（ISO 8601）
  endDate?: string; // 結束時間（ISO 8601）
  page?: number; // 頁碼
  limit?: number; // 每頁數量
}

/**
 * 站長收益分配項目
 */
export interface RevenueDistributionItem {
  id: number; // 交易 ID
  transactionTime: Date; // 交易時間
  customerId: number; // 會員 ID
  customerName: string; // 會員名稱
  memberWallet: string; // 會員錢包地址
  walletId: string; // 收款錢包 ID
  recipient: string; // 收款錢包名稱
  recipientWallet: string; // 收款錢包地址
  amount: string; // 分配金額（USDT）
  originalAmount: string; // 原始投資金額（USDT）
  ratio: number; // 分配比例（%）
  revenueRate: number; // 租戶收入比例（%）
  status: string; // 狀態
  txHash?: string; // 交易 Hash
  isFirstPayout: boolean; // 是否為首次分潤
  createdAt: Date; // 創建時間
}

/**
 * 站長收益分配列表響應
 */
export interface RevenueDistributionResponse {
  items: RevenueDistributionItem[]; // 收益分配列表
  total: number; // 總數
  page: number; // 當前頁碼
  limit: number; // 每頁數量
  totalPages: number; // 總頁數
}
