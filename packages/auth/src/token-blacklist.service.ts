/**
 * Token 黑名單服務
 * 
 * 用於存儲已登出的 token，防止已登出的 token 繼續使用
 * 
 * 實作方式：
 * 1. 開發環境：使用內存 Map（簡單快速）
 * 2. 生產環境：使用 Redis（推薦，支援分散式部署）
 */

export interface TokenBlacklistService {
  /**
   * 將 token 加入黑名單
   * @param token JWT token
   * @param expiresAt token 過期時間（Unix timestamp）
   */
  addToBlacklist(token: string, expiresAt: number): Promise<void>;

  /**
   * 檢查 token 是否在黑名單中
   */
  isBlacklisted(token: string): Promise<boolean>;

  /**
   * 清除過期的黑名單項目（可選，用於清理）
   */
  cleanupExpiredTokens?(): Promise<void>;
}

/**
 * 內存實作（適合開發環境或單機部署）
 */
export class InMemoryTokenBlacklistService
  implements TokenBlacklistService
{
  private blacklist: Map<string, number> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(enableAutoCleanup: boolean = true) {
    if (enableAutoCleanup) {
      // 每小時清理一次過期的 token
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpiredTokens();
      }, 60 * 60 * 1000);
    }
  }

  async addToBlacklist(token: string, expiresAt: number): Promise<void> {
    this.blacklist.set(token, expiresAt);
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const expiresAt = this.blacklist.get(token);
    if (!expiresAt) {
      return false;
    }

    // 如果已過期，從黑名單移除
    if (expiresAt < Date.now() / 1000) {
      this.blacklist.delete(token);
      return false;
    }

    return true;
  }

  async cleanupExpiredTokens(): Promise<void> {
    const now = Date.now() / 1000;
    for (const [token, expiresAt] of this.blacklist.entries()) {
      if (expiresAt < now) {
        this.blacklist.delete(token);
      }
    }
  }

  /**
   * 停止自動清理（用於測試或關閉時）
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

/**
 * Redis 實作（適合生產環境）
 * 
 * 使用範例：
 * ```typescript
 * import { createClient } from 'redis';
 * 
 * const redisClient = createClient({ url: process.env.REDIS_URL });
 * await redisClient.connect();
 * 
 * const blacklistService = new RedisTokenBlacklistService(redisClient);
 * ```
 */
export class RedisTokenBlacklistService
  implements TokenBlacklistService
{
  constructor(
    private redisClient: {
      set: (key: string, value: string, options?: { EX?: number }) => Promise<void>;
      get: (key: string) => Promise<string | null>;
      del: (key: string) => Promise<void>;
    },
  ) {}

  async addToBlacklist(token: string, expiresAt: number): Promise<void> {
    const ttl = Math.max(0, Math.floor(expiresAt - Date.now() / 1000));
    if (ttl > 0) {
      await this.redisClient.set(`blacklist:${token}`, '1', { EX: ttl });
    }
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const result = await this.redisClient.get(`blacklist:${token}`);
    return result !== null;
  }
}
