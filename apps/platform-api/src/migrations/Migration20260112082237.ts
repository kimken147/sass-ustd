import { Migration } from '@mikro-orm/migrations';

export class Migration20260112082237 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "system_wallets" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, "name" varchar(255) not null, "address" varchar(255) not null, "chain" text check ("chain" in ('tron', 'ethereum', 'bsc')) not null default 'tron', "type" text check ("type" in ('contract_execution', 'revenue_distribution')) not null, "status" text check ("status" in ('active', 'inactive', 'suspended')) not null default 'active', "verified" boolean not null default false, "verified_at" timestamptz null, "verification_tx_hash" varchar(255) null, "total_revenue" numeric(20,6) not null default '0', "description" text null, "last_used_at" timestamptz null, "private_key" varchar(255) null);`);
    this.addSql(`create index "system_wallets_name_index" on "system_wallets" ("name");`);
    this.addSql(`create index "system_wallets_address_index" on "system_wallets" ("address");`);
    this.addSql(`alter table "system_wallets" add constraint "system_wallets_address_unique" unique ("address");`);
    this.addSql(`create index "system_wallets_chain_index" on "system_wallets" ("chain");`);
    this.addSql(`create index "system_wallets_type_index" on "system_wallets" ("type");`);
    this.addSql(`create index "system_wallets_status_index" on "system_wallets" ("status");`);

    this.addSql(`alter table "tenants" add column "system_wallets" jsonb null;`);

    this.addSql(`alter table "users" add column "username" varchar(255) not null;`);
    this.addSql(`create index "users_username_index" on "users" ("username");`);
    this.addSql(`alter table "users" add constraint "users_username_tenant_id_unique" unique ("username", "tenant_id");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "system_wallets" cascade;`);

    this.addSql(`alter table "tenants" drop column "system_wallets";`);

    this.addSql(`drop index "users_username_index";`);
    this.addSql(`alter table "users" drop constraint "users_username_tenant_id_unique";`);
    this.addSql(`alter table "users" drop column "username";`);
  }

}
