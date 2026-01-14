import { Migration } from '@mikro-orm/migrations';

export class Migration20260114175153_init extends Migration {

  override async up(): Promise<void> {
    // ========== 創建 tenant_config 表 ==========
    // 注意：Tenant DB 不需要 tenants 表，只需要 tenant_config
    this.addSql(`create table "tenant_config" ("id" serial primary key, "slug" varchar(255) not null, "name" varchar(255) not null, "system_fee_rate" numeric(5,2) not null default 10, "crypto_config" jsonb not null, "revenue_wallets" jsonb not null, "system_wallets" jsonb null, "branding" jsonb null, "custom_domain" varchar(255) null, "custom_url" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "last_synced_at" timestamptz null);`);

    // ========== 創建 users 表 ==========
    // 注意：在 Tenant DB 中，不需要 tenant_id 欄位（因為整個資料庫就是單一租戶的）
    this.addSql(`create table "users" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "username" varchar(255) not null, "email" varchar(255) not null, "password" varchar(255) not null, "name" varchar(255) not null, "role" text check ("role" in ('platform_admin', 'tenant_admin', 'agent', 'customer')) not null, "status" text check ("status" in ('active', 'inactive', 'suspended')) not null default 'active', "security" jsonb not null, "last_login_at" timestamptz null, "last_login_ip" varchar(255) null, "email_verified" boolean not null default false, "email_verified_at" timestamptz null);`);
    this.addSql(`create index "users_username_index" on "users" ("username");`);
    this.addSql(`create index "users_email_index" on "users" ("email");`);
    this.addSql(`create index "users_role_index" on "users" ("role");`);
    this.addSql(`create index "users_status_index" on "users" ("status");`);
    // 在租戶資料庫內，username 和 email 全局唯一（不需要 tenant_id）
    this.addSql(`alter table "users" add constraint "users_username_unique" unique ("username");`);
    this.addSql(`alter table "users" add constraint "users_email_unique" unique ("email");`);

    this.addSql(`create table "agents" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "user_id" int not null, "name" varchar(255) not null, "code" varchar(255) not null, "parent_agent_id" int null, "path" varchar(255) not null default 'root', "level" int not null default 0, "wallet" jsonb null, "commission" jsonb not null, "status" text check ("status" in ('active', 'inactive', 'suspended')) not null default 'active', "stats" jsonb not null, "notes" text null);`);
    this.addSql(`create index "agents_user_id_index" on "agents" ("user_id");`);
    this.addSql(`create index "agents_code_index" on "agents" ("code");`);
    this.addSql(`create index "agents_parent_agent_id_index" on "agents" ("parent_agent_id");`);
    this.addSql(`create index "agents_path_index" on "agents" ("path");`);
    this.addSql(`create index "agents_level_index" on "agents" ("level");`);
    this.addSql(`create index "agents_status_index" on "agents" ("status");`);
    this.addSql(`alter table "agents" add constraint "agents_code_unique" unique ("code");`);

    this.addSql(`create table "customers" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "user_id" int not null, "referral_agent_id" int null, "status" text check ("status" in ('active', 'inactive', 'suspended')) not null default 'active', "wallet" jsonb null, "investment_stats" jsonb not null, "notes" text null);`);
    this.addSql(`create index "customers_user_id_index" on "customers" ("user_id");`);
    this.addSql(`create index "customers_referral_agent_id_index" on "customers" ("referral_agent_id");`);
    this.addSql(`create index "customers_status_index" on "customers" ("status");`);

    this.addSql(`create table "system_fee_distributions" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "customer_id" int not null, "amount" numeric(20,6) not null, "original_amount" numeric(20,6) not null, "fee_rate" numeric(5,2) not null, "system_wallet_address" varchar(255) not null, "chain" varchar(255) not null default 'tron', "status" text check ("status" in ('pending', 'processing', 'completed', 'failed')) not null default 'pending', "tx_hash" varchar(255) null, "tx_error" varchar(255) null, "processed_at" timestamptz null, "completed_at" timestamptz null, "notes" text null);`);
    this.addSql(`create index "system_fee_distributions_customer_id_index" on "system_fee_distributions" ("customer_id");`);
    this.addSql(`create index "system_fee_distributions_status_index" on "system_fee_distributions" ("status");`);

    this.addSql(`create table "revenue_distributions" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "customer_id" int not null, "total_amount" numeric(20,6) not null, "original_amount" numeric(20,6) not null, "revenue_rate" numeric(5,2) not null, "wallet_distributions" jsonb not null, "status" text check ("status" in ('pending', 'processing', 'completed', 'failed')) not null default 'pending', "processed_at" timestamptz null, "completed_at" timestamptz null, "notes" text null);`);
    this.addSql(`create index "revenue_distributions_customer_id_index" on "revenue_distributions" ("customer_id");`);
    this.addSql(`create index "revenue_distributions_status_index" on "revenue_distributions" ("status");`);

    this.addSql(`create table "commission_payouts" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "agent_id" int not null, "customer_id" int not null, "source_agent_id" int null, "type" text check ("type" in ('self', 'from_downline')) not null, "amount" numeric(20,6) not null, "original_investment_amount" numeric(20,6) not null, "commission_rate" numeric(5,2) not null, "received_amount" numeric(20,6) null, "self_rate" numeric(5,2) null, "passed_to_upline_amount" numeric(20,6) null, "wallet_address" varchar(255) not null, "chain" varchar(255) not null default 'tron', "status" text check ("status" in ('pending', 'processing', 'completed', 'failed')) not null default 'pending', "tx_hash" varchar(255) null, "tx_error" varchar(255) null, "processed_at" timestamptz null, "completed_at" timestamptz null, "is_first_payout" boolean not null default false, "notes" text null);`);
    this.addSql(`create index "commission_payouts_agent_id_index" on "commission_payouts" ("agent_id");`);
    this.addSql(`create index "commission_payouts_customer_id_index" on "commission_payouts" ("customer_id");`);
    this.addSql(`create index "commission_payouts_source_agent_id_index" on "commission_payouts" ("source_agent_id");`);
    this.addSql(`create index "commission_payouts_status_index" on "commission_payouts" ("status");`);

    // ========== 創建外鍵約束 ==========
    this.addSql(`alter table "agents" add constraint "agents_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`);
    this.addSql(`alter table "agents" add constraint "agents_parent_agent_id_foreign" foreign key ("parent_agent_id") references "agents" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "customers" add constraint "customers_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`);
    this.addSql(`alter table "customers" add constraint "customers_referral_agent_id_foreign" foreign key ("referral_agent_id") references "agents" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "system_fee_distributions" add constraint "system_fee_distributions_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade;`);

    this.addSql(`alter table "revenue_distributions" add constraint "revenue_distributions_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade;`);

    this.addSql(`alter table "commission_payouts" add constraint "commission_payouts_agent_id_foreign" foreign key ("agent_id") references "agents" ("id") on update cascade;`);
    this.addSql(`alter table "commission_payouts" add constraint "commission_payouts_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade;`);
    this.addSql(`alter table "commission_payouts" add constraint "commission_payouts_source_agent_id_foreign" foreign key ("source_agent_id") references "agents" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "agents" drop constraint "agents_user_id_foreign";`);

    this.addSql(`alter table "customers" drop constraint "customers_user_id_foreign";`);

    this.addSql(`alter table "agents" drop constraint "agents_parent_agent_id_foreign";`);

    this.addSql(`alter table "customers" drop constraint "customers_referral_agent_id_foreign";`);

    this.addSql(`alter table "commission_payouts" drop constraint "commission_payouts_agent_id_foreign";`);

    this.addSql(`alter table "commission_payouts" drop constraint "commission_payouts_source_agent_id_foreign";`);

    this.addSql(`alter table "system_fee_distributions" drop constraint "system_fee_distributions_customer_id_foreign";`);

    this.addSql(`alter table "revenue_distributions" drop constraint "revenue_distributions_customer_id_foreign";`);

    this.addSql(`alter table "commission_payouts" drop constraint "commission_payouts_customer_id_foreign";`);

    this.addSql(`drop table if exists "tenant_config" cascade;`);

    this.addSql(`drop table if exists "users" cascade;`);

    this.addSql(`drop table if exists "agents" cascade;`);

    this.addSql(`drop table if exists "customers" cascade;`);

    this.addSql(`drop table if exists "system_fee_distributions" cascade;`);

    this.addSql(`drop table if exists "revenue_distributions" cascade;`);

    this.addSql(`drop table if exists "commission_payouts" cascade;`);
  }

}
