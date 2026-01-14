import { Entity, ManyToOne, Index, Unique } from "@mikro-orm/core";
import { BaseUser } from "./user-base.entity";
import { Tenant } from "./tenant.entity";

/**
 * PlatformUser - Platform DB 使用
 * 包含 tenant 關聯（用於多租戶平台資料庫）
 * Platform Admin 的 tenant 為 null
 */
@Entity({ tableName: "users" })
@Unique({ properties: ["email", "tenant"] })
@Unique({ properties: ["username", "tenant"] })
export class PlatformUser extends BaseUser {
  // 租戶關聯（Platform Admin 沒有 tenant）
  @ManyToOne(() => Tenant, { nullable: true })
  @Index()
  tenant?: Tenant;
}
