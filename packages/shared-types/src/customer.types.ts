/**
 * 會員相關類型定義
 * 用於 tenant-api 和 tenant-admin 之間的資料交換
 */

import { TimeType } from "./site.types";

/**
 * 會員授權狀態
 */
export enum CustomerAuthorizationStatus {
  ALL = "all", // 全部
  AUTHORIZED = "authorized", // 已授權
  UNAUTHORIZED = "unauthorized", // 未授權
  EXPIRED = "expired", // 已失效
}

/**
 * 會員列表查詢參數
 */
export interface CustomerListQuery {
  startDate?: string; // 開始時間（ISO 8601）
  endDate?: string; // 結束時間（ISO 8601）
  timeType?: TimeType; // 時間類型（授權時間/提幣時間）
  authorizationStatus?: CustomerAuthorizationStatus; // 授權狀態
  address?: string; // 錢包地址（模糊查詢）
  page?: number; // 頁碼
  limit?: number; // 每頁數量
}

/**
 * 最近提幣資訊
 */
export interface RecentHarvestInfo {
  amount: number; // 最近提幣數量
  harvestTime?: Date; // 最近提幣時間
}

/**
 * 會員資訊
 */
export interface CustomerItem {
  id: number; // 會員 ID
  walletAddress: string; // 會員錢包地址
  notes?: string; // 站長備註
  authorizationTime?: Date; // 授權時間
  authorizationStatus: "authorized" | "unauthorized" | "expired"; // 授權狀態
  currentAmount: number; // 當前數量
  recentHarvest?: RecentHarvestInfo; // 最近提幣資訊
}

/**
 * 會員統計數據
 */
export interface CustomerStats {
  authorizedClients: number; // 授權客戶數量
  totalQuantity: number; // 總數量
  harvestQuantity: number; // 提幣數量
  profit: number; // 利潤
  merchantAgent: number; // 商戶代理
  systemFee: number; // 系統費用
  growthPercentage?: number; // 增長百分比（可選）
}

/**
 * 會員列表響應
 */
export interface CustomerListResponse {
  stats: CustomerStats; // 統計數據
  customers: CustomerItem[]; // 會員列表
  total: number; // 總數
  page: number; // 當前頁碼
  limit: number; // 每頁數量
  totalPages: number; // 總頁數
}
