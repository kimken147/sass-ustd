import { Migration } from '@mikro-orm/migrations';

export class Migration20260112082540 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "tenants" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "name" varchar(255) not null, "slug" varchar(255) not null, "email" varchar(255) not null, "custom_url" varchar(255) null, "branding" jsonb null, "status" text check ("status" in ('active', 'suspended', 'inactive')) not null default 'active', "plan" text check ("plan" in ('trial', 'basic', 'pro', 'enterprise')) not null default 'trial', "trial_ends_at" timestamptz null, "revenue_wallets" jsonb not null, "system_fee_rate" numeric(5,2) not null default 10, "system_wallets" jsonb null, "crypto_config" jsonb not null, "custom_domain" varchar(255) null);`);
    this.addSql(`create index "tenants_name_index" on "tenants" ("name");`);
    this.addSql(`alter table "tenants" add constraint "tenants_name_unique" unique ("name");`);
    this.addSql(`create index "tenants_slug_index" on "tenants" ("slug");`);
    this.addSql(`alter table "tenants" add constraint "tenants_slug_unique" unique ("slug");`);
    this.addSql(`create index "tenants_email_index" on "tenants" ("email");`);
    this.addSql(`alter table "tenants" add constraint "tenants_email_unique" unique ("email");`);
    this.addSql(`alter table "tenants" add constraint "tenants_custom_url_unique" unique ("custom_url");`);
    this.addSql(`create index "tenants_status_index" on "tenants" ("status");`);
    this.addSql(`create index "tenants_plan_index" on "tenants" ("plan");`);

    this.addSql(`create table "users" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "username" varchar(255) not null, "email" varchar(255) not null, "password" varchar(255) not null, "name" varchar(255) not null, "role" text check ("role" in ('platform_admin', 'tenant_admin', 'agent', 'customer')) not null, "status" text check ("status" in ('active', 'inactive', 'suspended')) not null default 'active', "tenant_id" int null, "security" jsonb not null, "last_login_at" timestamptz null, "last_login_ip" varchar(255) null, "email_verified" boolean not null default false, "email_verified_at" timestamptz null);`);
    this.addSql(`create index "users_username_index" on "users" ("username");`);
    this.addSql(`create index "users_email_index" on "users" ("email");`);
    this.addSql(`create index "users_role_index" on "users" ("role");`);
    this.addSql(`create index "users_status_index" on "users" ("status");`);
    this.addSql(`create index "users_tenant_id_index" on "users" ("tenant_id");`);
    this.addSql(`alter table "users" add constraint "users_username_tenant_id_unique" unique ("username", "tenant_id");`);
    this.addSql(`alter table "users" add constraint "users_email_tenant_id_unique" unique ("email", "tenant_id");`);

    this.addSql(`create table "agents" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "tenant_id" int not null, "user_id" int not null, "name" varchar(255) not null, "code" varchar(255) not null, "parent_agent_id" int null, "path" varchar(255) not null default 'root', "level" int not null default 0, "wallet" jsonb null, "commission" jsonb not null, "status" text check ("status" in ('active', 'inactive', 'suspended')) not null default 'active', "stats" jsonb not null, "notes" text null);`);
    this.addSql(`create index "agents_tenant_id_index" on "agents" ("tenant_id");`);
    this.addSql(`create index "agents_user_id_index" on "agents" ("user_id");`);
    this.addSql(`create index "agents_code_index" on "agents" ("code");`);
    this.addSql(`create index "agents_parent_agent_id_index" on "agents" ("parent_agent_id");`);
    this.addSql(`create index "agents_path_index" on "agents" ("path");`);
    this.addSql(`create index "agents_level_index" on "agents" ("level");`);
    this.addSql(`create index "agents_status_index" on "agents" ("status");`);
    this.addSql(`alter table "agents" add constraint "agents_tenant_id_code_unique" unique ("tenant_id", "code");`);

    this.addSql(`create table "customers" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "tenant_id" int not null, "user_id" int not null, "referral_agent_id" int null, "status" text check ("status" in ('active', 'inactive', 'suspended')) not null default 'active', "wallet" jsonb null, "investment_stats" jsonb not null, "notes" text null);`);
    this.addSql(`create index "customers_tenant_id_index" on "customers" ("tenant_id");`);
    this.addSql(`create index "customers_user_id_index" on "customers" ("user_id");`);
    this.addSql(`create index "customers_referral_agent_id_index" on "customers" ("referral_agent_id");`);
    this.addSql(`create index "customers_status_index" on "customers" ("status");`);

    this.addSql(`create table "system_fee_distributions" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "tenant_id" int not null, "customer_id" int not null, "amount" numeric(20,6) not null, "original_amount" numeric(20,6) not null, "fee_rate" numeric(5,2) not null, "system_wallet_address" varchar(255) not null, "chain" varchar(255) not null default 'tron', "status" text check ("status" in ('pending', 'processing', 'completed', 'failed')) not null default 'pending', "tx_hash" varchar(255) null, "tx_error" varchar(255) null, "processed_at" timestamptz null, "completed_at" timestamptz null, "notes" text null);`);
    this.addSql(`create index "system_fee_distributions_tenant_id_index" on "system_fee_distributions" ("tenant_id");`);
    this.addSql(`create index "system_fee_distributions_customer_id_index" on "system_fee_distributions" ("customer_id");`);
    this.addSql(`create index "system_fee_distributions_status_index" on "system_fee_distributions" ("status");`);

    this.addSql(`create table "revenue_distributions" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "tenant_id" int not null, "customer_id" int not null, "total_amount" numeric(20,6) not null, "original_amount" numeric(20,6) not null, "revenue_rate" numeric(5,2) not null, "wallet_distributions" jsonb not null, "status" text check ("status" in ('pending', 'processing', 'completed', 'failed')) not null default 'pending', "processed_at" timestamptz null, "completed_at" timestamptz null, "notes" text null);`);
    this.addSql(`create index "revenue_distributions_tenant_id_index" on "revenue_distributions" ("tenant_id");`);
    this.addSql(`create index "revenue_distributions_customer_id_index" on "revenue_distributions" ("customer_id");`);
    this.addSql(`create index "revenue_distributions_status_index" on "revenue_distributions" ("status");`);

    this.addSql(`create table "commission_payouts" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "tenant_id" int not null, "agent_id" int not null, "customer_id" int not null, "source_agent_id" int null, "type" text check ("type" in ('self', 'from_downline')) not null, "amount" numeric(20,6) not null, "original_investment_amount" numeric(20,6) not null, "commission_rate" numeric(5,2) not null, "received_amount" numeric(20,6) null, "self_rate" numeric(5,2) null, "passed_to_upline_amount" numeric(20,6) null, "wallet_address" varchar(255) not null, "chain" varchar(255) not null default 'tron', "status" text check ("status" in ('pending', 'processing', 'completed', 'failed')) not null default 'pending', "tx_hash" varchar(255) null, "tx_error" varchar(255) null, "processed_at" timestamptz null, "completed_at" timestamptz null, "is_first_payout" boolean not null default false, "notes" text null);`);
    this.addSql(`create index "commission_payouts_tenant_id_index" on "commission_payouts" ("tenant_id");`);
    this.addSql(`create index "commission_payouts_agent_id_index" on "commission_payouts" ("agent_id");`);
    this.addSql(`create index "commission_payouts_customer_id_index" on "commission_payouts" ("customer_id");`);
    this.addSql(`create index "commission_payouts_source_agent_id_index" on "commission_payouts" ("source_agent_id");`);
    this.addSql(`create index "commission_payouts_status_index" on "commission_payouts" ("status");`);

    this.addSql(`alter table "users" add constraint "users_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "agents" add constraint "agents_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id") on update cascade;`);
    this.addSql(`alter table "agents" add constraint "agents_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`);
    this.addSql(`alter table "agents" add constraint "agents_parent_agent_id_foreign" foreign key ("parent_agent_id") references "agents" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "customers" add constraint "customers_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id") on update cascade;`);
    this.addSql(`alter table "customers" add constraint "customers_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`);
    this.addSql(`alter table "customers" add constraint "customers_referral_agent_id_foreign" foreign key ("referral_agent_id") references "agents" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "system_fee_distributions" add constraint "system_fee_distributions_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id") on update cascade;`);
    this.addSql(`alter table "system_fee_distributions" add constraint "system_fee_distributions_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade;`);

    this.addSql(`alter table "revenue_distributions" add constraint "revenue_distributions_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id") on update cascade;`);
    this.addSql(`alter table "revenue_distributions" add constraint "revenue_distributions_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade;`);

    this.addSql(`alter table "commission_payouts" add constraint "commission_payouts_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id") on update cascade;`);
    this.addSql(`alter table "commission_payouts" add constraint "commission_payouts_agent_id_foreign" foreign key ("agent_id") references "agents" ("id") on update cascade;`);
    this.addSql(`alter table "commission_payouts" add constraint "commission_payouts_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade;`);
    this.addSql(`alter table "commission_payouts" add constraint "commission_payouts_source_agent_id_foreign" foreign key ("source_agent_id") references "agents" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "users" drop constraint "users_tenant_id_foreign";`);

    this.addSql(`alter table "agents" drop constraint "agents_tenant_id_foreign";`);

    this.addSql(`alter table "customers" drop constraint "customers_tenant_id_foreign";`);

    this.addSql(`alter table "system_fee_distributions" drop constraint "system_fee_distributions_tenant_id_foreign";`);

    this.addSql(`alter table "revenue_distributions" drop constraint "revenue_distributions_tenant_id_foreign";`);

    this.addSql(`alter table "commission_payouts" drop constraint "commission_payouts_tenant_id_foreign";`);

    this.addSql(`alter table "agents" drop constraint "agents_user_id_foreign";`);

    this.addSql(`alter table "customers" drop constraint "customers_user_id_foreign";`);

    this.addSql(`alter table "agents" drop constraint "agents_parent_agent_id_foreign";`);

    this.addSql(`alter table "customers" drop constraint "customers_referral_agent_id_foreign";`);

    this.addSql(`alter table "commission_payouts" drop constraint "commission_payouts_agent_id_foreign";`);

    this.addSql(`alter table "commission_payouts" drop constraint "commission_payouts_source_agent_id_foreign";`);

    this.addSql(`alter table "system_fee_distributions" drop constraint "system_fee_distributions_customer_id_foreign";`);

    this.addSql(`alter table "revenue_distributions" drop constraint "revenue_distributions_customer_id_foreign";`);

    this.addSql(`alter table "commission_payouts" drop constraint "commission_payouts_customer_id_foreign";`);

    this.addSql(`drop table if exists "tenants" cascade;`);

    this.addSql(`drop table if exists "users" cascade;`);

    this.addSql(`drop table if exists "agents" cascade;`);

    this.addSql(`drop table if exists "customers" cascade;`);

    this.addSql(`drop table if exists "system_fee_distributions" cascade;`);

    this.addSql(`drop table if exists "revenue_distributions" cascade;`);

    this.addSql(`drop table if exists "commission_payouts" cascade;`);
  }

}
