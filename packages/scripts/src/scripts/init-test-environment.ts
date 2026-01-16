#!/usr/bin/env node

/**
 * 測試環境初始化腳本
 *
 * 此腳本會完整初始化測試環境：
 * 1. 檢查環境配置
 * 2. 創建/重置 Platform DB
 * 3. 執行 Platform migrations
 * 4. 創建 Platform Admin
 * 5. 創建系統錢包（執行錢包 + 收款錢包）
 * 6. 創建測試租戶（含 Admin 和 Root Agent）
 *
 * 使用方式：
 *   pnpm init:test-env -- --slug test001 --execution-wallet TXxx... --execution-key abc123...
 *   pnpm init:test-env -- --slug test001 --execution-wallet TXxx... --execution-key abc123... --reset
 *   pnpm init:test-env -- --interactive
 */

import "reflect-metadata";

if (!Reflect || !Reflect.getMetadata) {
  throw new Error("reflect-metadata 未正確加載");
}

import { MikroORM } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { Migrator } from "@mikro-orm/migrations";
import { Client } from "pg";
import * as crypto from "crypto";
import * as readline from "readline";
import * as dotenv from "dotenv";
import * as path from "path";
import {
  PlatformUser,
  UserRole,
  UserStatus,
  Tenant,
  TenantStatus,
  TenantPlan,
  SystemWallet,
  SystemWalletType,
  SystemWalletStatus,
  SystemWalletChain,
  TenantConfig,
  TenantUser,
  Agent,
  Customer,
  SystemFeeDistribution,
  RevenueDistribution,
  CommissionPayout,
} from "@saas-platform/database";
import { PasswordService } from "@saas-platform/auth";
import * as bcrypt from "bcrypt";

// 載入環境變數
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config({
  path: path.resolve(__dirname, "../../../../apps/platform-api/.env"),
});

// ==========================================
// 配置
// ==========================================

interface Config {
  // 資料庫配置
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    platformDb: string;
  };
  // 加密密鑰
  encryptionKey: string;
  // USDT 合約地址
  usdt: {
    testnet: string;
    mainnet: string;
  };
}

interface Args {
  slug: string;
  network: "testnet" | "mainnet";
  executionWallet: string;
  executionKey: string;
  revenueWallet?: string;
  reset: boolean;
  skipExisting: boolean;
  platformAdminPassword: string;
  tenantAdminPassword: string;
  interactive: boolean;
}

const DEFAULT_CONFIG: Config = {
  db: {
    host: process.env.PLATFORM_DB_HOST || process.env.DB_HOST || "localhost",
    port: parseInt(
      process.env.PLATFORM_DB_PORT || process.env.DB_PORT || "5432"
    ),
    user: process.env.PLATFORM_DB_USER || process.env.DB_USER || "postgres",
    password:
      process.env.PLATFORM_DB_PASSWORD || process.env.DB_PASSWORD || "postgres",
    platformDb:
      process.env.PLATFORM_DB_NAME || process.env.DB_NAME || "saas_platform",
  },
  encryptionKey:
    process.env.ENCRYPTION_KEY ||
    "fd88a12a9eacdf35ef38ba4952f7603cc0c556ffc08d7700def190faf6968f96",
  usdt: {
    testnet: "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf",
    mainnet: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  },
};

// ==========================================
// 工具函數
// ==========================================

function log(message: string, type: "info" | "success" | "warn" | "error" = "info") {
  const icons = {
    info: "   ",
    success: " ✅",
    warn: " ⚠️",
    error: " ❌",
  };
  console.log(`${icons[type]} ${message}`);
}

function header(title: string) {
  console.log();
  console.log("═".repeat(60));
  console.log(` ${title}`);
  console.log("═".repeat(60));
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function confirm(question: string): Promise<boolean> {
  const answer = await prompt(`${question} (y/N): `);
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

/**
 * AES-256-GCM 加密
 */
function encrypt(plaintext: string, keyHex: string): string {
  const algorithm = "aes-256-gcm";
  const ivLength = 16;

  const key = Buffer.from(keyHex, "hex");
  const iv = crypto.randomBytes(ivLength);

  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const tag = cipher.getAuthTag();

  const ivBase64 = iv.toString("base64");
  const tagBase64 = tag.toString("base64");
  const encryptedBase64 = encrypted.toString("base64");

  return `${ivBase64}:${tagBase64}:${encryptedBase64}`;
}

// ==========================================
// 參數解析
// ==========================================

function parseArgs(): Partial<Args> {
  const args = process.argv.slice(2);
  const result: Partial<Args> = {};

  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case "--slug":
      case "-s":
        result.slug = value;
        i++;
        break;
      case "--network":
      case "-n":
        result.network = value as "testnet" | "mainnet";
        i++;
        break;
      case "--execution-wallet":
      case "-w":
        result.executionWallet = value;
        i++;
        break;
      case "--execution-key":
      case "-k":
        result.executionKey = value;
        i++;
        break;
      case "--revenue-wallet":
        result.revenueWallet = value;
        i++;
        break;
      case "--reset":
        result.reset = true;
        break;
      case "--skip-existing":
        result.skipExisting = true;
        break;
      case "--platform-admin-password":
        result.platformAdminPassword = value;
        i++;
        break;
      case "--tenant-admin-password":
        result.tenantAdminPassword = value;
        i++;
        break;
      case "--interactive":
      case "-i":
        result.interactive = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }

  return result;
}

function printHelp() {
  console.log(`
測試環境初始化腳本

使用方式：
  pnpm init:test-env -- [options]

必要參數：
  --slug, -s <string>              租戶 slug（例如：test001）
  --execution-wallet, -w <address> 執行錢包地址（TRON 地址）
  --execution-key, -k <privateKey> 執行錢包私鑰（64 位 hex）

可選參數：
  --network, -n <testnet|mainnet>  網路模式（預設：testnet）
  --revenue-wallet <address>       收款錢包地址（預設：使用執行錢包）
  --reset                          清空並重建所有資料庫
  --skip-existing                  跳過已存在的資料
  --platform-admin-password <pwd>  Platform Admin 密碼（預設：admin123）
  --tenant-admin-password <pwd>    Tenant Admin 密碼（預設：admin123）
  --interactive, -i                互動模式
  --help, -h                       顯示此說明

範例：
  # 基本使用
  pnpm init:test-env -- --slug test001 \\
    --execution-wallet TAtVP7LX4JS7gkuu1qaSkCkiKXZydWA2f3 \\
    --execution-key a594763422c895698aa340c9c63c4ee0abd0b1bdbb7fabeb9c27aeaad2e5fe9b

  # 重置環境
  pnpm init:test-env -- --slug test001 --execution-wallet TXxx --execution-key xxx --reset

  # 互動模式
  pnpm init:test-env -- --interactive
`);
}

async function collectArgs(): Promise<Args> {
  const parsedArgs = parseArgs();

  // 預設值
  const defaults: Args = {
    slug: "",
    network: "testnet",
    executionWallet: "",
    executionKey: "",
    reset: false,
    skipExisting: false,
    platformAdminPassword: "admin123",
    tenantAdminPassword: "admin123",
    interactive: false,
  };

  const args: Args = { ...defaults, ...parsedArgs };

  // 互動模式
  if (args.interactive) {
    console.log("\n🔧 互動模式\n");

    if (!args.slug) {
      args.slug = await prompt("請輸入租戶 slug: ");
    }

    if (!args.executionWallet) {
      args.executionWallet = await prompt("請輸入執行錢包地址: ");
    }

    if (!args.executionKey) {
      args.executionKey = await prompt("請輸入執行錢包私鑰: ");
    }

    const networkChoice = await prompt("網路模式 (1=testnet, 2=mainnet) [1]: ");
    if (networkChoice === "2") {
      args.network = "mainnet";
    }

    const resetChoice = await confirm("是否重置現有資料庫？");
    args.reset = resetChoice;
  }

  // 驗證必要參數
  const errors: string[] = [];

  if (!args.slug) {
    errors.push("--slug 是必要參數");
  } else if (!/^[a-z0-9-]+$/.test(args.slug)) {
    errors.push("slug 只能包含小寫字母、數字和連字號");
  }

  if (!args.executionWallet) {
    errors.push("--execution-wallet 是必要參數");
  } else if (!args.executionWallet.startsWith("T") || args.executionWallet.length !== 34) {
    errors.push("執行錢包地址格式不正確（應為 T 開頭的 34 位 TRON 地址）");
  }

  if (!args.executionKey) {
    errors.push("--execution-key 是必要參數");
  } else if (!/^[0-9a-fA-F]{64}$/.test(args.executionKey)) {
    errors.push("執行錢包私鑰格式不正確（應為 64 位 hex 字串）");
  }

  if (errors.length > 0) {
    console.error("\n❌ 參數錯誤:");
    errors.forEach((e) => console.error(`   - ${e}`));
    console.error("\n使用 --help 查看說明");
    process.exit(1);
  }

  // 收款錢包預設使用執行錢包
  if (!args.revenueWallet) {
    args.revenueWallet = args.executionWallet;
  }

  return args;
}

// ==========================================
// 資料庫操作
// ==========================================

async function checkDatabaseExists(
  client: Client,
  dbName: string
): Promise<boolean> {
  const result = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [dbName]
  );
  return result.rows.length > 0;
}

async function dropDatabase(client: Client, dbName: string): Promise<void> {
  // 先終止所有連接
  await client.query(
    `SELECT pg_terminate_backend(pg_stat_activity.pid)
     FROM pg_stat_activity
     WHERE pg_stat_activity.datname = $1
     AND pid <> pg_backend_pid()`,
    [dbName]
  );
  await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
}

async function createDatabase(client: Client, dbName: string): Promise<void> {
  await client.query(`CREATE DATABASE ${dbName}`);
}

// ==========================================
// Phase 1: 環境檢查
// ==========================================

async function phase1_checkEnvironment(config: Config): Promise<Client> {
  header("Phase 1: 環境檢查");

  log("檢查 PostgreSQL 連接...");

  const client = new Client({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: "postgres",
  });

  try {
    await client.connect();
    log(`PostgreSQL 連接成功 (${config.db.host}:${config.db.port})`, "success");
  } catch (error) {
    log(`無法連接 PostgreSQL: ${error.message}`, "error");
    process.exit(1);
  }

  log(`加密密鑰: ${config.encryptionKey.substring(0, 8)}...`, "info");

  return client;
}

// ==========================================
// Phase 2: Platform DB 初始化
// ==========================================

async function phase2_initPlatformDb(
  client: Client,
  config: Config,
  args: Args
): Promise<void> {
  header("Phase 2: Platform DB 初始化");

  const dbName = config.db.platformDb;
  const exists = await checkDatabaseExists(client, dbName);

  if (exists) {
    if (args.reset) {
      log(`重置 Platform DB: ${dbName}...`, "warn");
      await dropDatabase(client, dbName);
      await createDatabase(client, dbName);
      log(`Platform DB 已重建`, "success");
    } else if (args.skipExisting) {
      log(`Platform DB 已存在，跳過創建`, "info");
    } else {
      const shouldReset = await confirm(
        `Platform DB "${dbName}" 已存在，是否重置？`
      );
      if (shouldReset) {
        await dropDatabase(client, dbName);
        await createDatabase(client, dbName);
        log(`Platform DB 已重建`, "success");
      } else {
        log(`保留現有 Platform DB`, "info");
      }
    }
  } else {
    log(`創建 Platform DB: ${dbName}...`);
    await createDatabase(client, dbName);
    log(`Platform DB 已創建`, "success");
  }

  // 執行 migrations
  log("執行 Platform migrations...");

  const projectRoot = path.resolve(__dirname, "../../../../");
  const migrationsPath = path.resolve(
    projectRoot,
    "apps/platform-api/src/migrations"
  );

  const orm = await MikroORM.init<PostgreSqlDriver>({
    driver: PostgreSqlDriver,
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    dbName: dbName,
    entities: [Tenant, PlatformUser, SystemWallet],
    migrations: {
      path: migrationsPath,
      pathTs: migrationsPath,
      tableName: "mikro_orm_migrations",
      transactional: true,
      disableForeignKeys: false,
      allOrNothing: true,
      emit: "ts",
    },
    extensions: [Migrator],
    debug: false,
  });

  try {
    const migrator = orm.getMigrator();
    const pending = await migrator.getPendingMigrations();

    if (pending.length > 0) {
      log(`發現 ${pending.length} 個待執行的 migration`);
      await migrator.up();
      log(`Platform migrations 執行完成`, "success");
    } else {
      log(`Platform migrations 已是最新`, "success");
    }
  } finally {
    await orm.close();
  }
}

// ==========================================
// Phase 3: Platform Admin 創建
// ==========================================

async function phase3_createPlatformAdmin(
  config: Config,
  args: Args
): Promise<void> {
  header("Phase 3: Platform Admin 創建");

  const orm = await MikroORM.init<PostgreSqlDriver>({
    driver: PostgreSqlDriver,
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    dbName: config.db.platformDb,
    entities: [Tenant, PlatformUser, SystemWallet],
    debug: false,
  });

  try {
    const em = orm.em.fork();

    // 檢查是否已存在
    const existing = await em.findOne(PlatformUser, {
      username: "admin",
      tenant: null,
    });

    if (existing) {
      if (args.reset) {
        await em.removeAndFlush(existing);
        log("已刪除現有 Platform Admin", "warn");
      } else {
        log("Platform Admin 已存在，跳過創建", "info");
        return;
      }
    }

    const passwordService = new PasswordService();
    const hashedPassword = await passwordService.hashPassword(
      args.platformAdminPassword
    );

    const user = new PlatformUser();
    user.username = "admin";
    user.email = "admin@platform.local";
    user.password = hashedPassword;
    user.name = "Platform Administrator";
    user.role = UserRole.PLATFORM_ADMIN;
    user.status = UserStatus.ACTIVE;
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();

    await em.persistAndFlush(user);
    log(`Platform Admin 創建成功 (admin / ${args.platformAdminPassword})`, "success");
  } finally {
    await orm.close();
  }
}

// ==========================================
// Phase 4: System Wallets 創建
// ==========================================

async function phase4_createSystemWallets(
  config: Config,
  args: Args
): Promise<{ executionWalletId: number | null; revenueWalletId: number }> {
  header("Phase 4: System Wallets 創建");

  const orm = await MikroORM.init<PostgreSqlDriver>({
    driver: PostgreSqlDriver,
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    dbName: config.db.platformDb,
    entities: [Tenant, PlatformUser, SystemWallet],
    debug: false,
  });

  let executionWalletId: number | null = null;
  let revenueWalletId: number;

  try {
    const em = orm.em.fork();

    // 加密私鑰
    const encryptedPrivateKey = encrypt(args.executionKey, config.encryptionKey);
    log(`私鑰已加密: ${encryptedPrivateKey.substring(0, 30)}...`);

    // 檢查地址是否相同
    const sameAddress = args.revenueWallet === args.executionWallet;

    if (sameAddress) {
      // 同一地址：只創建 REVENUE_DISTRIBUTION 類型的錢包
      // 執行錢包資訊將直接存入 cryptoConfig，不創建 SystemWallet 記錄
      log("執行錢包與收款錢包使用相同地址", "info");
      log("將創建單一錢包 (REVENUE_DISTRIBUTION)，執行錢包資訊直接存入 cryptoConfig", "info");

      // 檢查是否已存在
      let wallet = await em.findOne(SystemWallet, {
        address: args.executionWallet,
      });

      if (wallet) {
        if (args.reset) {
          // 更新為 REVENUE_DISTRIBUTION 類型
          wallet.type = SystemWalletType.REVENUE_DISTRIBUTION;
          wallet.name = `${args.network === "testnet" ? "Nile 測試網" : "正式網"}收款錢包`;
          wallet.privateKey = undefined; // 收款錢包不需要私鑰
          await em.flush();
          log("已更新錢包為收款錢包", "warn");
        } else {
          log("錢包已存在，跳過創建", "info");
        }
        revenueWalletId = wallet.id;
      } else {
        wallet = em.create(SystemWallet, {
          name: `${args.network === "testnet" ? "Nile 測試網" : "正式網"}收款錢包`,
          address: args.executionWallet,
          chain: SystemWalletChain.TRON,
          type: SystemWalletType.REVENUE_DISTRIBUTION,
          status: SystemWalletStatus.ACTIVE,
          description: `用於 ${args.network === "testnet" ? "Nile 測試網" : "正式網"}的系統費收款錢包（同時用於合約執行）`,
        });
        await em.persistAndFlush(wallet);
        revenueWalletId = wallet.id;
        log(`收款錢包已創建 (ID: ${revenueWalletId})`, "success");
      }

      // executionWalletId 保持為 null，執行錢包資訊將直接存入 cryptoConfig
    } else {
      // 不同地址：分別創建兩個錢包

      // 1. 創建執行錢包
      let executionWallet = await em.findOne(SystemWallet, {
        address: args.executionWallet,
      });

      if (executionWallet) {
        if (args.reset) {
          executionWallet.type = SystemWalletType.CONTRACT_EXECUTION;
          executionWallet.privateKey = encryptedPrivateKey;
          executionWallet.name = `${args.network === "testnet" ? "Nile 測試網" : "正式網"}執行錢包`;
          await em.flush();
          log("已更新執行錢包", "warn");
        } else {
          log("執行錢包已存在，跳過創建", "info");
        }
        executionWalletId = executionWallet.id;
      } else {
        executionWallet = em.create(SystemWallet, {
          name: `${args.network === "testnet" ? "Nile 測試網" : "正式網"}執行錢包`,
          address: args.executionWallet,
          chain: SystemWalletChain.TRON,
          type: SystemWalletType.CONTRACT_EXECUTION,
          status: SystemWalletStatus.ACTIVE,
          privateKey: encryptedPrivateKey,
          description: `用於 ${args.network === "testnet" ? "Nile 測試網" : "正式網"}的合約執行錢包`,
        });
        await em.persistAndFlush(executionWallet);
        executionWalletId = executionWallet.id;
        log(`執行錢包已創建 (ID: ${executionWalletId})`, "success");
      }

      // 2. 創建收款錢包
      let revenueWallet = await em.findOne(SystemWallet, {
        address: args.revenueWallet,
      });

      if (revenueWallet) {
        if (args.reset) {
          revenueWallet.type = SystemWalletType.REVENUE_DISTRIBUTION;
          revenueWallet.name = `${args.network === "testnet" ? "Nile 測試網" : "正式網"}收款錢包`;
          await em.flush();
          log("已更新收款錢包", "warn");
        } else {
          log("收款錢包已存在，跳過創建", "info");
        }
        revenueWalletId = revenueWallet.id;
      } else {
        revenueWallet = em.create(SystemWallet, {
          name: `${args.network === "testnet" ? "Nile 測試網" : "正式網"}收款錢包`,
          address: args.revenueWallet!,
          chain: SystemWalletChain.TRON,
          type: SystemWalletType.REVENUE_DISTRIBUTION,
          status: SystemWalletStatus.ACTIVE,
          description: `用於 ${args.network === "testnet" ? "Nile 測試網" : "正式網"}的系統費收款錢包`,
        });
        await em.persistAndFlush(revenueWallet);
        revenueWalletId = revenueWallet.id;
        log(`收款錢包已創建 (ID: ${revenueWalletId})`, "success");
      }
    }

    log(`錢包地址: ${args.executionWallet}`, "info");
  } finally {
    await orm.close();
  }

  return { executionWalletId, revenueWalletId };
}

// ==========================================
// Phase 5: Tenant 創建
// ==========================================

async function phase5_createTenant(
  client: Client,
  config: Config,
  args: Args,
  walletIds: { executionWalletId: number | null; revenueWalletId: number }
): Promise<void> {
  header("Phase 5: Tenant 創建");

  const tenantDbName = `tenant_${args.slug}`;
  const tenantDbExists = await checkDatabaseExists(client, tenantDbName);

  // 處理 Tenant DB
  if (tenantDbExists) {
    if (args.reset) {
      log(`重置 Tenant DB: ${tenantDbName}...`, "warn");
      await dropDatabase(client, tenantDbName);
      await createDatabase(client, tenantDbName);
      log(`Tenant DB 已重建`, "success");
    } else if (args.skipExisting) {
      log(`Tenant DB 已存在，跳過創建`, "info");
    } else {
      const shouldReset = await confirm(
        `Tenant DB "${tenantDbName}" 已存在，是否重置？`
      );
      if (shouldReset) {
        await dropDatabase(client, tenantDbName);
        await createDatabase(client, tenantDbName);
        log(`Tenant DB 已重建`, "success");
      } else {
        log(`保留現有 Tenant DB`, "info");
        return;
      }
    }
  } else {
    log(`創建 Tenant DB: ${tenantDbName}...`);
    await createDatabase(client, tenantDbName);
    log(`Tenant DB 已創建`, "success");
  }

  // 執行 Tenant migrations
  log("執行 Tenant migrations...");

  const projectRoot = path.resolve(__dirname, "../../../../");
  const tenantMigrationsPath = path.resolve(
    projectRoot,
    "apps/tenant-api/src/migrations"
  );

  const tenantOrm = await MikroORM.init<PostgreSqlDriver>({
    driver: PostgreSqlDriver,
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    dbName: tenantDbName,
    entities: [
      TenantConfig,
      TenantUser,
      Agent,
      Customer,
      SystemFeeDistribution,
      RevenueDistribution,
      CommissionPayout,
    ],
    migrations: {
      path: tenantMigrationsPath,
      pathTs: tenantMigrationsPath,
      tableName: "mikro_orm_migrations",
      transactional: true,
      disableForeignKeys: false,
      allOrNothing: true,
      emit: "ts",
    },
    extensions: [Migrator],
    debug: false,
  });

  try {
    const migrator = tenantOrm.getMigrator();
    const pending = await migrator.getPendingMigrations();

    if (pending.length > 0) {
      log(`發現 ${pending.length} 個待執行的 migration`);
      await migrator.up();
      log(`Tenant migrations 執行完成`, "success");
    } else {
      log(`Tenant migrations 已是最新`, "success");
    }
  } finally {
    await tenantOrm.close();
  }

  // 加密私鑰
  const encryptedPrivateKey = encrypt(args.executionKey, config.encryptionKey);

  // 構建 cryptoConfig
  const usdtAddress =
    args.network === "testnet" ? config.usdt.testnet : config.usdt.mainnet;

  const cryptoConfig: any = {
    supportedChains: ["tron"],
    supportedTokens: ["USDT", "TRX"],
    investmentContractAddress: "",
    usdtTokenAddress: usdtAddress,
    executionWalletAddress: args.executionWallet,
    executionWalletPrivateKey: encryptedPrivateKey,
    minInvestment: 100,
    maxInvestment: 100000,
    tenantRevenueRate: 60,
    agentCommissionRate: 30,
  };

  // 只有在有獨立執行錢包時才設定 executionWalletId
  if (walletIds.executionWalletId !== null) {
    cryptoConfig.executionWalletId = walletIds.executionWalletId;
  }

  // 構建 systemWallets
  const systemWallets = [
    {
      walletId: walletIds.revenueWalletId,
      address: args.revenueWallet || args.executionWallet,
      name: `${args.network === "testnet" ? "Nile 測試網" : "正式網"}收款錢包`,
      chain: "tron",
      percentage: 100,
      syncedAt: new Date(),
    },
  ];

  // 創建 Platform DB 中的 Tenant 記錄
  log("創建 Tenant 記錄...");

  const platformOrm = await MikroORM.init<PostgreSqlDriver>({
    driver: PostgreSqlDriver,
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    dbName: config.db.platformDb,
    entities: [Tenant, PlatformUser, SystemWallet],
    debug: false,
  });

  let tenantRecord: Tenant;

  try {
    const em = platformOrm.em.fork();

    // 檢查是否已存在
    const existingTenant = await em.findOne(Tenant, { slug: args.slug });

    if (existingTenant) {
      if (args.reset) {
        // 更新現有記錄
        existingTenant.cryptoConfig = cryptoConfig;
        existingTenant.systemWallets = systemWallets;
        await em.flush();
        tenantRecord = existingTenant;
        log("已更新 Tenant 記錄", "warn");
      } else {
        tenantRecord = existingTenant;
        log("Tenant 記錄已存在，跳過創建", "info");
      }
    } else {
      tenantRecord = em.create(Tenant, {
        name: `Test Tenant ${args.slug}`,
        slug: args.slug,
        email: `admin@${args.slug}.local`,
        plan: TenantPlan.TRIAL,
        status: TenantStatus.ACTIVE,
        systemFeeRate: 10,
        cryptoConfig,
        systemWallets,
        revenueWallets: [],
      });
      await em.persistAndFlush(tenantRecord);
      log(`Tenant 記錄已創建 (ID: ${tenantRecord.id})`, "success");
    }
  } finally {
    await platformOrm.close();
  }

  // 創建 tenant_config、admin user 和 root agent
  log("創建 tenant_config 和管理員...");

  const tenantOrm2 = await MikroORM.init<PostgreSqlDriver>({
    driver: PostgreSqlDriver,
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    dbName: tenantDbName,
    entities: [
      TenantConfig,
      TenantUser,
      Agent,
      Customer,
      SystemFeeDistribution,
      RevenueDistribution,
      CommissionPayout,
    ],
    metadataCache: { enabled: false },
    debug: false,
  });

  try {
    const connection = tenantOrm2.em.getConnection();
    const now = new Date().toISOString();

    // 檢查 tenant_config 是否存在
    const configResult = await connection.execute(
      `SELECT "id" FROM "tenant_config" WHERE "id" = 1`
    );

    if (!configResult || (configResult as any[]).length === 0) {
      // 創建 tenant_config
      await connection.execute(
        `INSERT INTO "tenant_config" (
          "id", "slug", "name", "system_fee_rate", "crypto_config",
          "revenue_wallets", "system_wallets", "branding",
          "custom_domain", "custom_url", "created_at", "updated_at", "last_synced_at"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          1,
          args.slug,
          `Test Tenant ${args.slug}`,
          10,
          JSON.stringify(cryptoConfig),
          JSON.stringify([]),
          JSON.stringify(systemWallets),
          JSON.stringify(null),
          null,
          null,
          now,
          now,
          now,
        ]
      );
      log("tenant_config 已創建", "success");
    } else {
      // 更新 tenant_config
      await connection.execute(
        `UPDATE "tenant_config" SET
          "crypto_config" = ?,
          "system_wallets" = ?,
          "updated_at" = ?,
          "last_synced_at" = ?
        WHERE "id" = 1`,
        [JSON.stringify(cryptoConfig), JSON.stringify(systemWallets), now, now]
      );
      log("tenant_config 已更新", "info");
    }

    // 檢查管理員是否存在
    const adminUsername = "admin";
    const adminEmail = `admin@${args.slug}.local`;

    const existingUser = await connection.execute(
      `SELECT "id" FROM "users" WHERE "username" = ? OR "email" = ?`,
      [adminUsername, adminEmail]
    );

    let userId: number;
    let agentCode: string;

    if (existingUser && (existingUser as any[]).length > 0) {
      userId = (existingUser as any[])[0].id;
      log("管理員用戶已存在，跳過創建", "info");

      // 檢查 agent 是否存在
      const existingAgent = await connection.execute(
        `SELECT "code" FROM "agents" WHERE "user_id" = ?`,
        [userId]
      );
      if (existingAgent && (existingAgent as any[]).length > 0) {
        agentCode = (existingAgent as any[])[0].code;
      } else {
        agentCode = `AG${Math.floor(Math.random() * 1000000)
          .toString()
          .padStart(6, "0")}`;
      }
    } else {
      // 創建管理員用戶
      const hashedPassword = await bcrypt.hash(args.tenantAdminPassword, 10);
      const securityJson = JSON.stringify({
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
      });

      const insertResult = await connection.execute(
        `INSERT INTO "users" (
          "created_at", "updated_at", "username", "email", "password",
          "name", "role", "status", "security", "email_verified"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING "id"`,
        [
          now,
          now,
          adminUsername,
          adminEmail,
          hashedPassword,
          "Tenant Administrator",
          UserRole.TENANT_ADMIN,
          UserStatus.ACTIVE,
          securityJson,
          false,
        ]
      );

      userId =
        (insertResult as any).rows?.[0]?.id || (insertResult as any)[0]?.id;
      log(
        `管理員用戶已創建 (admin / ${args.tenantAdminPassword})`,
        "success"
      );

      // 創建 Root Agent
      agentCode = `AG${Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, "0")}`;

      const commissionJson = JSON.stringify({
        baseRate: cryptoConfig.agentCommissionRate,
        selfRate: 100.0,
        uplineRate: 0.0,
        isEnabled: true,
      });

      const statsJson = JSON.stringify({
        totalCustomers: 0,
        activeCustomers: 0,
        totalInvestment: 0,
        totalCommissionEarned: 0,
        selfCommissionEarned: 0,
        uplineCommissionPassed: 0,
        directSubAgents: 0,
        totalSubAgents: 0,
      });

      await connection.execute(
        `INSERT INTO "agents" (
          "created_at", "updated_at", "user_id", "name", "code",
          "parent_agent_id", "path", "level", "wallet", "commission",
          "status", "stats", "notes"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          now,
          now,
          userId,
          "Tenant Administrator",
          agentCode,
          null,
          "root",
          0,
          JSON.stringify(null),
          commissionJson,
          "active",
          statsJson,
          "系統自動創建的站長代理記錄",
        ]
      );
      log(`Root Agent 已創建 (Code: ${agentCode})`, "success");
    }
  } finally {
    await tenantOrm2.close();
  }
}

// ==========================================
// Phase 6: 驗證 & 輸出
// ==========================================

async function phase6_verify(config: Config, args: Args): Promise<void> {
  header("Phase 6: 驗證 & 輸出");

  // 驗證 Platform DB
  const platformOrm = await MikroORM.init<PostgreSqlDriver>({
    driver: PostgreSqlDriver,
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    dbName: config.db.platformDb,
    entities: [Tenant, PlatformUser, SystemWallet],
    debug: false,
  });

  try {
    const em = platformOrm.em.fork();

    const adminCount = await em.count(PlatformUser, {
      role: UserRole.PLATFORM_ADMIN,
    });
    const walletCount = await em.count(SystemWallet);
    const tenantCount = await em.count(Tenant);

    log(`Platform Admin: ${adminCount} 個`, "success");
    log(`System Wallets: ${walletCount} 個`, "success");
    log(`Tenants: ${tenantCount} 個`, "success");
  } finally {
    await platformOrm.close();
  }

  // 驗證 Tenant DB
  const tenantDbName = `tenant_${args.slug}`;
  const tenantOrm = await MikroORM.init<PostgreSqlDriver>({
    driver: PostgreSqlDriver,
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    dbName: tenantDbName,
    entities: [
      TenantConfig,
      TenantUser,
      Agent,
      Customer,
      SystemFeeDistribution,
      RevenueDistribution,
      CommissionPayout,
    ],
    debug: false,
  });

  let agentCode = "";

  try {
    const connection = tenantOrm.em.getConnection();

    const configResult = await connection.execute(
      `SELECT "slug" FROM "tenant_config" WHERE "id" = 1`
    );
    const userResult = await connection.execute(
      `SELECT COUNT(*) as count FROM "users"`
    );
    const agentResult = await connection.execute(
      `SELECT "code" FROM "agents" WHERE "level" = 0`
    );

    log(`Tenant Config: ${(configResult as any[]).length > 0 ? "OK" : "Missing"}`, "success");
    log(`Tenant Users: ${(userResult as any[])[0].count} 個`, "success");

    if ((agentResult as any[]).length > 0) {
      agentCode = (agentResult as any[])[0].code;
      log(`Root Agent: ${agentCode}`, "success");
    }
  } finally {
    await tenantOrm.close();
  }

  // 輸出摘要
  const usdtAddress =
    args.network === "testnet" ? config.usdt.testnet : config.usdt.mainnet;

  console.log();
  console.log("═".repeat(60));
  console.log(" 🚀 測試環境初始化完成");
  console.log("═".repeat(60));
  console.log();
  console.log(` 📦 Platform DB: ${config.db.platformDb}`);
  console.log(`    └─ Platform Admin: admin / ${args.platformAdminPassword}`);
  console.log();
  console.log(` 💼 System Wallets:`);
  console.log(`    └─ 執行/收款錢包: ${args.executionWallet}`);
  console.log();
  console.log(` 🏢 Tenant: ${args.slug}`);
  console.log(`    └─ Database: tenant_${args.slug}`);
  console.log(`    └─ Admin: admin / ${args.tenantAdminPassword}`);
  console.log(`    └─ Root Agent Code: ${agentCode}`);
  console.log();
  console.log(` 🔗 Network: ${args.network === "testnet" ? "Nile Testnet" : "Mainnet"}`);
  console.log(`    └─ USDT Contract: ${usdtAddress}`);
  console.log();
  console.log("═".repeat(60));
  console.log();
  console.log(" 📝 下一步:");
  console.log(`    1. 啟動 Platform API: cd apps/platform-api && pnpm dev`);
  console.log(`    2. 啟動 Tenant API: cd apps/tenant-api && pnpm dev`);
  console.log(`    3. 前往 https://nileex.io/join/getJoinPage 領取測試幣`);
  console.log();
}

// ==========================================
// 主函數
// ==========================================

async function main() {
  console.log();
  console.log("═".repeat(60));
  console.log(" 🔧 SaaS Platform 測試環境初始化腳本");
  console.log("═".repeat(60));

  try {
    // 收集參數
    const args = await collectArgs();

    console.log();
    log(`租戶 Slug: ${args.slug}`);
    log(`網路模式: ${args.network}`);
    log(`執行錢包: ${args.executionWallet}`);
    log(`重置模式: ${args.reset ? "是" : "否"}`);

    // Phase 1: 環境檢查
    const client = await phase1_checkEnvironment(DEFAULT_CONFIG);

    try {
      // Phase 2: Platform DB 初始化
      await phase2_initPlatformDb(client, DEFAULT_CONFIG, args);

      // Phase 3: Platform Admin 創建
      await phase3_createPlatformAdmin(DEFAULT_CONFIG, args);

      // Phase 4: System Wallets 創建
      const walletIds = await phase4_createSystemWallets(DEFAULT_CONFIG, args);

      // Phase 5: Tenant 創建
      await phase5_createTenant(client, DEFAULT_CONFIG, args, walletIds);

      // Phase 6: 驗證 & 輸出
      await phase6_verify(DEFAULT_CONFIG, args);
    } finally {
      await client.end();
    }
  } catch (error) {
    console.error();
    console.error("❌ 發生錯誤:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (process.env.DEBUG === "true") {
        console.error("\n詳細錯誤:");
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
