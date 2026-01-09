// UserRole 定義（避免循環依賴）
export enum UserRole {
  PLATFORM_ADMIN = "platform_admin",
  TENANT_ADMIN = "tenant_admin",
  AGENT = "agent",
  CUSTOMER = "customer",
}

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
   * 是否需要租戶（Platform Admin 不需要）
   */
  requireTenant: boolean;

  /**
   * API 名稱（用於日誌和錯誤訊息）
   */
  apiName: string;
}

/**
 * 預設配置
 */
export const AUTH_CONFIGS: Record<string, AuthConfig> = {
  PLATFORM: {
    allowedRoles: [UserRole.PLATFORM_ADMIN],
    requireTenant: false,
    apiName: "Platform API",
  },
  TENANT: {
    allowedRoles: [UserRole.TENANT_ADMIN, UserRole.AGENT, UserRole.CUSTOMER],
    requireTenant: true,
    apiName: "Tenant API",
  },
  TENANT_ADMIN_ONLY: {
    allowedRoles: [UserRole.TENANT_ADMIN],
    requireTenant: true,
    apiName: "Tenant Admin API",
  },
  AGENT_ONLY: {
    allowedRoles: [UserRole.AGENT],
    requireTenant: true,
    apiName: "Agent API",
  },
};
