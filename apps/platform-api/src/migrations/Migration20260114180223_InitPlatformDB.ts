import { Migration } from "@mikro-orm/migrations";

export class Migration20260114180223_InitPlatformDB extends Migration {
  override async up(): Promise<void> {
    // Create system_wallets table
    this.addSql(
      `create table "system_wallets" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "name" varchar(255) not null, "address" varchar(255) not null, "chain" text check ("chain" in ('tron', 'ethereum', 'bsc')) not null default 'tron', "type" text check ("type" in ('contract_execution', 'revenue_distribution')) not null, "status" text check ("status" in ('active', 'inactive', 'suspended')) not null default 'active', "verified" boolean not null default false, "verified_at" timestamptz null, "verification_tx_hash" varchar(255) null, "total_revenue" numeric(20,6) not null default '0', "description" text null, "last_used_at" timestamptz null, "private_key" varchar(255) null);`
    );
    this.addSql(
      `create index "system_wallets_name_index" on "system_wallets" ("name");`
    );
    this.addSql(
      `create index "system_wallets_address_index" on "system_wallets" ("address");`
    );
    this.addSql(
      `alter table "system_wallets" add constraint "system_wallets_address_unique" unique ("address");`
    );
    this.addSql(
      `create index "system_wallets_chain_index" on "system_wallets" ("chain");`
    );
    this.addSql(
      `create index "system_wallets_type_index" on "system_wallets" ("type");`
    );
    this.addSql(
      `create index "system_wallets_status_index" on "system_wallets" ("status");`
    );

    // Create tenants table
    this.addSql(
      `create table "tenants" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "name" varchar(255) not null, "slug" varchar(255) not null, "email" varchar(255) null, "custom_url" varchar(255) null, "branding" jsonb null, "status" text check ("status" in ('active', 'suspended', 'inactive')) not null default 'active', "plan" text check ("plan" in ('trial', 'basic', 'pro', 'enterprise')) not null default 'trial', "trial_ends_at" timestamptz null, "revenue_wallets" jsonb not null, "system_fee_rate" numeric(5,2) not null default 10, "system_wallets" jsonb null, "crypto_config" jsonb not null, "custom_domain" varchar(255) null);`
    );
    this.addSql(`create index "tenants_name_index" on "tenants" ("name");`);
    this.addSql(
      `alter table "tenants" add constraint "tenants_name_unique" unique ("name");`
    );
    this.addSql(`create index "tenants_slug_index" on "tenants" ("slug");`);
    this.addSql(
      `alter table "tenants" add constraint "tenants_slug_unique" unique ("slug");`
    );
    this.addSql(`create index "tenants_email_index" on "tenants" ("email");`);
    this.addSql(
      `alter table "tenants" add constraint "tenants_email_unique" unique ("email");`
    );
    this.addSql(
      `alter table "tenants" add constraint "tenants_custom_url_unique" unique ("custom_url");`
    );
    this.addSql(`create index "tenants_status_index" on "tenants" ("status");`);
    this.addSql(`create index "tenants_plan_index" on "tenants" ("plan");`);

    // Create users table (PlatformUser)
    this.addSql(
      `create table "users" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "username" varchar(255) not null, "email" varchar(255) not null, "password" varchar(255) not null, "name" varchar(255) not null, "role" text check ("role" in ('platform_admin', 'tenant_admin', 'agent', 'customer')) not null, "status" text check ("status" in ('active', 'inactive', 'suspended')) not null default 'active', "security" jsonb not null, "last_login_at" timestamptz null, "last_login_ip" varchar(255) null, "email_verified" boolean not null default false, "email_verified_at" timestamptz null, "tenant_id" int null);`
    );
    this.addSql(`create index "users_username_index" on "users" ("username");`);
    this.addSql(`create index "users_email_index" on "users" ("email");`);
    this.addSql(`create index "users_role_index" on "users" ("role");`);
    this.addSql(`create index "users_status_index" on "users" ("status");`);
    this.addSql(
      `create index "users_tenant_id_index" on "users" ("tenant_id");`
    );
    this.addSql(
      `alter table "users" add constraint "users_username_tenant_id_unique" unique ("username", "tenant_id");`
    );
    this.addSql(
      `alter table "users" add constraint "users_email_tenant_id_unique" unique ("email", "tenant_id");`
    );

    // Add foreign keys
    this.addSql(
      `alter table "users" add constraint "users_tenant_id_foreign" foreign key ("tenant_id") references "tenants" ("id") on update cascade on delete set null;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "users" drop constraint "users_tenant_id_foreign";`
    );
    this.addSql(`drop table if exists "users" cascade;`);
    this.addSql(`drop table if exists "tenants" cascade;`);
    this.addSql(`drop table if exists "system_wallets" cascade;`);
  }
}
