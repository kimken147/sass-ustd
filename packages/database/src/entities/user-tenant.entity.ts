import { Entity, Unique } from "@mikro-orm/core";
import { BaseUser } from "./user-base.entity";

/**
 * TenantUser - Tenant DB 使用
 * 不包含 tenant 關聯（單租戶資料庫，所有用戶都屬於該租戶）
 */
@Entity({ tableName: "users" })
@Unique({ properties: ["email"] })
@Unique({ properties: ["username"] })
export class TenantUser extends BaseUser {
  // 不需要 tenant 關聯
  // 在獨立的租戶資料庫中，所有用戶都屬於該租戶
}
