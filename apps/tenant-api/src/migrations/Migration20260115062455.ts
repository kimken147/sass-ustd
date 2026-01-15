import { Migration } from "@mikro-orm/migrations";

export class Migration20260115062455 extends Migration {
  override async up(): Promise<void> {
    // 將 users 表的 email 欄位改為可選（nullable）
    // 注意：PostgreSQL 的唯一約束允許多個 NULL 值，所以不需要修改唯一約束
    this.addSql(`alter table "users" alter column "email" drop not null;`);
  }

  override async down(): Promise<void> {
    // 回滾：將 email 欄位改回必填
    // 注意：如果資料庫中已有 NULL 值，這個操作會失敗
    // 需要先將所有 NULL 值更新為非 NULL 值才能執行
    this.addSql(`alter table "users" alter column "email" set not null;`);
  }
}
