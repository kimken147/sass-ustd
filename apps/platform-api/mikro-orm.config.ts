import { defineConfig } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { Migrator } from "@mikro-orm/migrations";
import { SeedManager } from "@mikro-orm/seeder";
import {
  Tenant,
  User,
  Agent,
  Customer,
  CommissionPayout,
  RevenueDistribution,
  SystemFeeDistribution,
  SystemWallet,
} from "@saas-platform/database";

export default defineConfig({
  driver: PostgreSqlDriver,

  // 資料庫連接設定
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  dbName: process.env.DB_NAME || "saas_platform",

  // 🔑 直接指定 Entity classes（類型安全）
  entities: [
    Tenant,
    User,
    Agent,
    Customer,
    CommissionPayout,
    RevenueDistribution,
    SystemFeeDistribution,
    SystemWallet,
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

  // Seeder 設定
  seeder: {
    path: "./src/seeders",
    pathTs: "./src/seeders",
  },

  // 開發設定
  debug: process.env.NODE_ENV === "development",

  // 擴展
  extensions: [Migrator, SeedManager],

  // Schema 設定
  schemaGenerator: {
    disableForeignKeys: false,
    createForeignKeyConstraints: true,
  },
});
