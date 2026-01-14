import {
  Property,
  Enum,
  Index,
} from "@mikro-orm/core";
import { BaseEntity } from "./base.entity";

export enum UserRole {
  PLATFORM_ADMIN = "platform_admin", // 平台管理員
  TENANT_ADMIN = "tenant_admin", // 租戶管理員
  AGENT = "agent", // 代理商
  CUSTOMER = "customer", // 投資客戶
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

export interface UserSecurity {
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  lastPasswordChange?: Date;
  failedLoginAttempts: number;
  lastFailedLogin?: Date;
}

/**
 * BaseUser - 抽象基類
 * 包含所有 User 共享的欄位
 * 由 PlatformUser 和 TenantUser 繼承
 */
export abstract class BaseUser extends BaseEntity {
  // 基本資訊
  @Property()
  @Index()
  username!: string; // 登入帳號（在租戶內唯一，Platform Admin 全局唯一）

  @Property()
  @Index()
  email!: string;

  @Property({ hidden: true })
  password!: string; // bcrypt hashed

  @Property()
  name!: string;

  // 角色與狀態
  @Enum(() => UserRole)
  @Index()
  role!: UserRole;

  @Enum(() => UserStatus)
  @Index()
  status: UserStatus = UserStatus.ACTIVE;

  // 安全設置
  @Property({ type: "json" })
  security: UserSecurity = {
    twoFactorEnabled: false,
    failedLoginAttempts: 0,
  };

  // 登入資訊
  @Property({ nullable: true })
  lastLoginAt?: Date;

  @Property({ nullable: true })
  lastLoginIp?: string;

  // Email 驗證
  @Property({ default: false })
  emailVerified: boolean = false;

  @Property({ nullable: true })
  emailVerifiedAt?: Date;
}
