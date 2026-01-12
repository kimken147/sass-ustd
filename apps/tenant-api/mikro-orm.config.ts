import { defineConfig } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { Migrator } from "@mikro-orm/migrations";
import {
  Tenant,
  User,
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
  // 注意：CLI 使用時需要設置 TENANT_ID 環境變數
  dbName: `${process.env.TENANT_DB_NAME || "tenant"}_${process.env.TENANT_ID || "test_001"}`,

  // 🔑 直接指定 Entity classes（類型安全）
  entities: [
    Tenant,
    User,
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

  // 擴展
  extensions: [Migrator],

  // Schema 設定
  schemaGenerator: {
    disableForeignKeys: false,
    createForeignKeyConstraints: true,
  },
});
