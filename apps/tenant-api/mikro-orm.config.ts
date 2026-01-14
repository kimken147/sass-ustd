import { defineConfig } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { Migrator } from "@mikro-orm/migrations";
import {
  TenantConfig,
  TenantUser,
  Agent,
  Customer,
  CommissionPayout,
  RevenueDistribution,
  SystemFeeDistribution,
} from "@saas-platform/database";

export default defineConfig({
  driver: PostgreSqlDriver,

  // 資料庫連接設定
  host: process.env.TENANT_DB_HOST || "localhost",
  port: parseInt(process.env.TENANT_DB_PORT || "5432"),
  user: process.env.TENANT_DB_USER || "postgres",
  password: process.env.TENANT_DB_PASSWORD || "postgres",
  // 使用 TENANT_SLUG 環境變數（與 app.module.ts 保持一致）
  dbName: `tenant_${process.env.TENANT_SLUG || "test001"}`,

  // 🔑 直接指定 Entity classes（類型安全）
  // 注意：Tenant DB 使用 TenantConfig 和 TenantUser
  entities: [
    TenantConfig,
    TenantUser,
    Agent,
    Customer,
    CommissionPayout,
    RevenueDistribution,
    SystemFeeDistribution,
  ],

  // Migration 設定
  migrations: {
    path: "./src/migrations",
    pathTs: "./src/migrations",
    tableName: "mikro_orm_migrations",
    transactional: true,
    disableForeignKeys: false,
    allOrNothing: true,
    emit: "ts",
  },

  // 開發設定
  debug: process.env.NODE_ENV === "development",

  // Entity 發現配置（與 app.module.ts 保持一致）
  discovery: {
    warnWhenNoEntities: true,
    requireEntitiesArray: true, // 要求明確指定 entities
    disableDynamicFileAccess: true, // 禁用動態文件訪問
  },

  // 擴展
  extensions: [Migrator],

  // Schema 設定
  schemaGenerator: {
    disableForeignKeys: false,
    createForeignKeyConstraints: true,
  },
});
