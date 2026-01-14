import { Migration } from '@mikro-orm/migrations';

/**
 * 重構多租戶架構 Migration
 * 
 * 變更說明：
 * 1. 創建 tenant_config 表（取代 tenants 表）
 * 2. 移除 tenants 表
 * 3. 移除各表中的 tenant_id 列和相關外鍵約束
 * 
 * 這個 migration 假設是在全新的租戶資料庫上執行（沒有現有資料）
 * 如果有現有資料，需要先備份並手動遷移
 */
export class Migration20260115100000 extends Migration {

  override async up(): Promise<void> {
    // ========== 1. 創建 tenant_config 表 ==========
    this.addSql(`create table "tenant_config" (
      "id" int not null default 1,
      "slug" varchar(255) not null,
      "name" varchar(255) not null,
      "system_fee_rate" numeric(5,2) not null default 10,
      "crypto_config" jsonb not null default '{}',
      "revenue_wallets" jsonb not null default '[]',
      "system_wallets" jsonb null,
      "branding" jsonb null,
      "custom_domain" varchar(255) null,
      "custom_url" varchar(255) null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "last_synced_at" timestamptz null,
      constraint "tenant_config_pkey" primary key ("id")
    );`);

    // ========== 2. 移除外鍵約束 ==========
    // 移除 users 表的 tenant_id 外鍵
    this.addSql(`alter table "users" drop constraint if exists "users_tenant_id_foreign";`);
    
    // 移除 agents 表的 tenant_id 外鍵
    this.addSql(`alter table "agents" drop constraint if exists "agents_tenant_id_foreign";`);
    
    // 移除 customers 表的 tenant_id 外鍵
    this.addSql(`alter table "customers" drop constraint if exists "customers_tenant_id_foreign";`);
    
    // 移除 system_fee_distributions 表的 tenant_id 外鍵
    this.addSql(`alter table "system_fee_distributions" drop constraint if exists "system_fee_distributions_tenant_id_foreign";`);
    
    // 移除 revenue_distributions 表的 tenant_id 外鍵
    this.addSql(`alter table "revenue_distributions" drop constraint if exists "revenue_distributions_tenant_id_foreign";`);
    
    // 移除 commission_payouts 表的 tenant_id 外鍵
    this.addSql(`alter table "commission_payouts" drop constraint if exists "commission_payouts_tenant_id_foreign";`);

    // ========== 3. 移除 tenant_id 列 ==========
    // 移除 users 表的 tenant_id 列和相關索引
    this.addSql(`drop index if exists "users_tenant_id_index";`);
    this.addSql(`alter table "users" drop constraint if exists "users_username_tenant_id_unique";`);
    this.addSql(`alter table "users" drop constraint if exists "users_email_tenant_id_unique";`);
    this.addSql(`alter table "users" drop column if exists "tenant_id";`);
    // 添加新的唯一約束（不再需要 tenant_id）
    this.addSql(`alter table "users" add constraint "users_username_unique" unique ("username");`);
    this.addSql(`alter table "users" add constraint "users_email_unique" unique ("email");`);

    // 移除 agents 表的 tenant_id 列和相關索引
    this.addSql(`drop index if exists "agents_tenant_id_index";`);
    this.addSql(`alter table "agents" drop constraint if exists "agents_tenant_id_code_unique";`);
    this.addSql(`alter table "agents" drop column if exists "tenant_id";`);
    // 添加新的唯一約束（不再需要 tenant_id）
    this.addSql(`alter table "agents" add constraint "agents_code_unique" unique ("code");`);

    // 移除 customers 表的 tenant_id 列和相關索引
    this.addSql(`drop index if exists "customers_tenant_id_index";`);
    this.addSql(`alter table "customers" drop column if exists "tenant_id";`);

    // 移除 system_fee_distributions 表的 tenant_id 列和相關索引
    this.addSql(`drop index if exists "system_fee_distributions_tenant_id_index";`);
    this.addSql(`alter table "system_fee_distributions" drop column if exists "tenant_id";`);

    // 移除 revenue_distributions 表的 tenant_id 列和相關索引
    this.addSql(`drop index if exists "revenue_distributions_tenant_id_index";`);
    this.addSql(`alter table "revenue_distributions" drop column if exists "tenant_id";`);

    // 移除 commission_payouts 表的 tenant_id 列和相關索引
    this.addSql(`drop index if exists "commission_payouts_tenant_id_index";`);
    this.addSql(`alter table "commission_payouts" drop column if exists "tenant_id";`);

    // ========== 4. 移除 tenants 表 ==========
    this.addSql(`drop table if exists "tenants" cascade;`);
  }

  override async down(): Promise<void> {
    // 注意：down migration 會丟失 tenant_config 中的資料
    
    // ========== 1. 重新創建 tenants 表 ==========
    this.addSql(`create table "tenants" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "name" varchar(255) not null, "slug" varchar(255) not null, "email" varchar(255) null, "custom_url" varchar(255) null, "branding" jsonb null, "status" text check ("status" in ('active', 'suspended', 'inactive')) not null default 'active', "plan" text check ("plan" in ('trial', 'basic', 'pro', 'enterprise')) not null default 'trial', "trial_ends_at" timestamptz null, "revenue_wallets" jsonb not null, "system_fee_rate" numeric(5,2) not null default 10, "system_wallets" jsonb null, "crypto_config" jsonb not null, "custom_domain" varchar(255) null);`);
    this.addSql(`create index "tenants_name_index" on "tenants" ("name");`);
    this.addSql(`alter table "tenants" add constraint "tenants_name_unique" unique ("name");`);
    this.addSql(`create index "tenants_slug_index" on "tenants" ("slug");`);
    this.addSql(`alter table "tenants" add constraint "tenants_slug_unique" unique ("slug");`);
    this.addSql(`create index "tenants_email_index" on "tenants" ("email");`);
    this.addSql(`alter table "tenants" add constraint "tenants_email_unique" unique ("email");`);
    this.addSql(`alter table "tenants" add constraint "tenants_custom_url_unique" unique ("custom_url");`);
    this.addSql(`create index "tenants_status_index" on "tenants" ("status");`);
    this.addSql(`create index "tenants_plan_index" on "tenants" ("plan");`);

    // ========== 2. 重新添加 tenant_id 列 ==========
    // users 表
    this.addSql(`alter table "users" drop constraint if exists "users_username_unique";`);
    this.addSql(`alter table "users" drop constraint if exists "users_email_unique";`);
    this.addSql(`alter table "users" add column "tenant_id" int null;`);
    this.addSql(`create index "users_tenant_id_index" on "users" ("tenant_id");`);
    this.addSql(`alter table "users" add constraint "users_username_tenant_id_unique" unique ("username", "tenant_id");`);
    this.addSql(`alter table "users" add constraint "users_email_tenant_id_unique" unique ("email", "tenant_id");`);
    this.addSql(`alter table "users" add constraint "users_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id") on update cascade on delete set null;`);

    // agents 表
    this.addSql(`alter table "agents" drop constraint if exists "agents_code_unique";`);
    this.addSql(`alter table "agents" add column "tenant_id" int not null default 1;`);
    this.addSql(`create index "agents_tenant_id_index" on "agents" ("tenant_id");`);
    this.addSql(`alter table "agents" add constraint "agents_tenant_id_code_unique" unique ("tenant_id", "code");`);
    this.addSql(`alter table "agents" add constraint "agents_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id") on update cascade;`);

    // customers 表
    this.addSql(`alter table "customers" add column "tenant_id" int not null default 1;`);
    this.addSql(`create index "customers_tenant_id_index" on "customers" ("tenant_id");`);
    this.addSql(`alter table "customers" add constraint "customers_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id") on update cascade;`);

    // system_fee_distributions 表
    this.addSql(`alter table "system_fee_distributions" add column "tenant_id" int not null default 1;`);
    this.addSql(`create index "system_fee_distributions_tenant_id_index" on "system_fee_distributions" ("tenant_id");`);
    this.addSql(`alter table "system_fee_distributions" add constraint "system_fee_distributions_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id") on update cascade;`);

    // revenue_distributions 表
    this.addSql(`alter table "revenue_distributions" add column "tenant_id" int not null default 1;`);
    this.addSql(`create index "revenue_distributions_tenant_id_index" on "revenue_distributions" ("tenant_id");`);
    this.addSql(`alter table "revenue_distributions" add constraint "revenue_distributions_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id") on update cascade;`);

    // commission_payouts 表
    this.addSql(`alter table "commission_payouts" add column "tenant_id" int not null default 1;`);
    this.addSql(`create index "commission_payouts_tenant_id_index" on "commission_payouts" ("tenant_id");`);
    this.addSql(`alter table "commission_payouts" add constraint "commission_payouts_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id") on update cascade;`);

    // ========== 3. 移除 tenant_config 表 ==========
    this.addSql(`drop table if exists "tenant_config" cascade;`);
  }

}
