/**
 * 站點相關類型定義
 * 用於 platform-api 和 platform-admin 之間的資料交換
 */

/**
 * 時間類型
 */
export enum TimeType {
  AUTHORIZATION_TIME = "authorization_time", // 授權時間
  HARVEST_TIME = "harvest_time", // 提幣時間
}

/**
 * 授權狀態
 */
export enum AuthorizationStatus {
  ALL = "all",
  AUTHORIZED = "authorized",
  UNAUTHORIZED = "unauthorized",
}

/**
 * 站點統計數據
 */
export interface SiteStats {
  authorizedClients: number; // 授權客戶數量
  totalQuantity: number; // 總數量
  harvestQuantity: number; // 提幣數量
  profit: number; // 利潤
  merchantAgent: number; // 商戶代理
  systemFee: number; // 系統費用
  growthPercentage?: number; // 增長百分比（可選）
}

/**
 * 授權錢包信息（執行合約錢包）
 */
export interface AuthorizationWallet {
  label: string; // 錢包標籤（系統錢包名稱）
  address: string; // 錢包地址（系統錢包地址）
}

/**
 * 系統費錢包信息（分潤錢包）
 */
export interface SystemFeeWallet {
  label: string; // 錢包標籤（系統錢包名稱）
  address: string; // 錢包地址（系統錢包地址）
  percentage: number; // 分配比例（%）
}

/**
 * 站點列表項
 */
export interface SiteItem {
  id: number; // 站點 ID
  name: string; // 站點名稱
  slug: string; // 站點 slug
  customDomain?: string; // 自訂域名
  siteRate: number; // 站點費率（%）
  authorizationWallet: AuthorizationWallet; // 授權錢包
  systemFeeWallets: SystemFeeWallet[]; // 系統費錢包列表
  stats: SiteStats; // 站點統計數據
}

/**
 * 站點列表查詢參數
 */
export interface SiteListQuery {
  startTime?: string; // 訂單時間範圍（開始時間）
  endTime?: string; // 訂單時間範圍（結束時間）
  timeType?: TimeType; // 時間類型
  authorizationStatus?: AuthorizationStatus; // 授權狀態
  page?: number; // 頁碼
  limit?: number; // 每頁數量
}

/**
 * 站點列表響應
 */
export interface SiteListResponse {
  totalStats: SiteStats; // 總體統計數據
  sites: SiteItem[]; // 站點列表
  total: number; // 總數
  page: number; // 當前頁碼
  limit: number; // 每頁數量
  totalPages: number; // 總頁數
}
