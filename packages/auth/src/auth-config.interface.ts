// UserRole 定義（避免循環依賴）
export enum UserRole {
  PLATFORM_ADMIN = "platform_admin",
  TENANT_ADMIN = "tenant_admin",
  AGENT = "agent",
  CUSTOMER = "customer",
}

/**
 * 租戶模式
 * - 'required': 必須有租戶關聯（Platform DB 查詢租戶用戶）
 * - 'none': 必須沒有租戶關聯（Platform Admin）
 * - 'skip': 跳過租戶檢查（Tenant DB，因為整個 DB 都是同一租戶）
 */
export type TenantMode = "required" | "none" | "skip";

/**
 * 認證配置接口
 * 用於配置不同 API 允許的角色
 */
export interface AuthConfig {
  /**
   * 允許的角色列表
   */
  allowedRoles: UserRole[];

  /**
   * 租戶模式
   * - 'required': 必須有租戶關聯（Platform DB 查詢租戶用戶）
   * - 'none': 必須沒有租戶關聯（Platform Admin）
   * - 'skip': 跳過租戶檢查（Tenant DB，整個 DB 都是同一租戶）
   */
  tenantMode: TenantMode;

  /**
   * API 名稱（用於日誌和錯誤訊息）
   */
  apiName: string;
}

/**
 * 預設配置
 */
export const AUTH_CONFIGS: Record<string, AuthConfig> = {
  /**
   * Platform API - 平台管理員登入
   * 使用 Platform DB，用戶沒有租戶關聯
   */
  PLATFORM: {
    allowedRoles: [UserRole.PLATFORM_ADMIN],
    tenantMode: "none",
    apiName: "Platform API",
  },

  /**
   * Tenant API - 租戶用戶登入
   * 使用獨立的 Tenant DB，整個 DB 都屬於同一租戶
   * 不需要 tenant 條件過濾
   */
  TENANT: {
    allowedRoles: [UserRole.TENANT_ADMIN, UserRole.AGENT, UserRole.CUSTOMER],
    tenantMode: "skip",
    apiName: "Tenant API",
  },

  /**
   * Tenant Admin Only - 僅租戶管理員
   */
  TENANT_ADMIN_ONLY: {
    allowedRoles: [UserRole.TENANT_ADMIN],
    tenantMode: "skip",
    apiName: "Tenant Admin API",
  },

  /**
   * Agent Only - 僅代理商
   */
  AGENT_ONLY: {
    allowedRoles: [UserRole.AGENT],
    tenantMode: "skip",
    apiName: "Agent API",
  },
};
