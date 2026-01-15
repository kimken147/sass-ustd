export enum ErrorCode {
  // Wallet related
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_WRONG_NETWORK = 'WALLET_WRONG_NETWORK',

  // Approval related
  APPROVE_REJECTED = 'APPROVE_REJECTED',
  APPROVE_FAILED = 'APPROVE_FAILED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',

  // API related
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Tenant related
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorMessages: Record<ErrorCode, string> = {
  [ErrorCode.WALLET_NOT_FOUND]: '請在錢包 App 中開啟此頁面',
  [ErrorCode.WALLET_NOT_CONNECTED]: '請先連接錢包',
  [ErrorCode.WALLET_WRONG_NETWORK]: '請切換到 TRON 主網',
  [ErrorCode.APPROVE_REJECTED]: '您已取消授權',
  [ErrorCode.APPROVE_FAILED]: '授權失敗，請重試',
  [ErrorCode.INSUFFICIENT_BALANCE]: '餘額不足',
  [ErrorCode.API_ERROR]: '系統錯誤，請稍後重試',
  [ErrorCode.NETWORK_ERROR]: '網絡連線異常',
  [ErrorCode.TENANT_NOT_FOUND]: '頁面不存在',
};
