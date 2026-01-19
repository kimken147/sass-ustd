/**
 * Error codes for application-specific errors
 *
 * @example
 * ```ts
 * throw new AppError(ErrorCode.WALLET_NOT_FOUND, errorMessages[ErrorCode.WALLET_NOT_FOUND]);
 * ```
 */
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

/**
 * Custom application error class with error code and optional original error
 *
 * @example
 * ```ts
 * try {
 *   // some operation
 * } catch (error) {
 *   throw new AppError(ErrorCode.API_ERROR, errorMessages[ErrorCode.API_ERROR], error);
 * }
 * ```
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public originalError?: unknown,
  ) {
    super(message, { cause: originalError });
    this.name = 'AppError';
    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Type guard to check if an error is an AppError instance
 *
 * @param error - The error to check
 * @returns True if the error is an AppError
 *
 * @example
 * ```ts
 * try {
 *   // some operation
 * } catch (error) {
 *   if (isAppError(error)) {
 *     console.log(error.code); // TypeScript knows error is AppError
 *   }
 * }
 * ```
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * User-friendly error messages for each error code
 */
export const errorMessages: Record<ErrorCode, string> = {
  [ErrorCode.WALLET_NOT_FOUND]: '請在錢包 App 中打開此頁面',
  [ErrorCode.WALLET_NOT_CONNECTED]: '請先連接錢包',
  [ErrorCode.WALLET_WRONG_NETWORK]: '請切換到 TRON 主網',
  [ErrorCode.APPROVE_REJECTED]: '您已取消授權',
  [ErrorCode.APPROVE_FAILED]: '授權失敗，請重試',
  [ErrorCode.INSUFFICIENT_BALANCE]: '餘額不足',
  [ErrorCode.API_ERROR]: '系統錯誤，請稍後重試',
  [ErrorCode.NETWORK_ERROR]: '網路連接異常',
  [ErrorCode.TENANT_NOT_FOUND]: '頁面不存在',
};
