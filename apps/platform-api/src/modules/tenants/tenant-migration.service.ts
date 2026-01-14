import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MikroORM } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { Migrator } from "@mikro-orm/migrations";
import * as path from "path";
import * as bcrypt from "bcrypt";
import {
  TenantConfig,
  User,
  UserRole,
  UserStatus,
  Agent,
  Customer,
  SystemFeeDistribution,
  RevenueDistribution,
  CommissionPayout,
} from "@saas-platform/database";

@Injectable()
export class TenantMigrationService {
  private readonly logger = new Logger(TenantMigrationService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 為指定的租戶資料庫執行 migration
   * @param tenantSlug 租戶 slug
   */
  async runMigrationsForTenant(tenantSlug: string): Promise<void> {
    const dbHost = this.configService.get<string>(
      "PLATFORM_DB_HOST",
      "localhost"
    );
    const dbPort = this.configService.get<number>("PLATFORM_DB_PORT", 5432);
    const dbUser = this.configService.get<string>(
      "PLATFORM_DB_USER",
      "postgres"
    );
    const dbPassword = this.configService.get<string>(
      "PLATFORM_DB_PASSWORD",
      "postgres"
    );
    const dbName = `tenant_${tenantSlug}`;

    // 計算 tenant-api migration 文件的路徑
    const projectRoot = path.resolve(__dirname, "../../../../../");
    const migrationsPath = path.resolve(
      projectRoot,
      "apps/tenant-api/src/migrations"
    );

    this.logger.log(
      `開始為租戶 ${tenantSlug} (資料庫: ${dbName}) 執行 migration...`
    );
    this.logger.log(`Migration 文件路徑: ${migrationsPath}`);

    let orm: MikroORM | null = null;

    try {
      // 動態創建 MikroORM 實例連接到租戶資料庫
      orm = await MikroORM.init<PostgreSqlDriver>({
        driver: PostgreSqlDriver,
        dbName,
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,

        // 租戶資料庫使用的 entities（使用 TenantConfig 取代 Tenant）
        entities: [
          TenantConfig,
          User,
          Agent,
          Customer,
          SystemFeeDistribution,
          RevenueDistribution,
          CommissionPayout,
        ],

        // Migration 配置（使用 tenant-api 的 migration 文件）
        migrations: {
          path: migrationsPath,
          pathTs: migrationsPath,
          tableName: "mikro_orm_migrations",
          transactional: true,
          disableForeignKeys: false,
          allOrNothing: true,
          emit: "ts",
        },

        // 擴展
        extensions: [Migrator],

        // 開發設定
        debug: this.configService.get("NODE_ENV") !== "production",
      });

      // 獲取 Migrator 實例
      const migrator = orm.getMigrator();

      // 檢查待執行的 migration
      const pending = await migrator.getPendingMigrations();
      this.logger.log(
        `發現 ${pending.length} 個待執行的 migration: ${pending
          .map((m) => m.name)
          .join(", ")}`
      );

      if (pending.length === 0) {
        this.logger.warn(`租戶 ${tenantSlug} 沒有待執行的 migration`);
        return;
      }

      // 執行所有待處理的 migration
      await migrator.up();

      this.logger.log(`租戶 ${tenantSlug} 的 migration 執行成功`);
    } catch (error) {
      this.logger.error(
        `為租戶 ${tenantSlug} 執行 migration 失敗: ${error.message}`,
        error.stack
      );
      throw error;
    } finally {
      // 關閉 ORM 連接
      if (orm) {
        await orm.close(true);
      }
    }
  }

  /**
   * 為指定的租戶資料庫創建管理員用戶和初始化配置
   * @param tenantSlug 租戶 slug
   * @param tenant 租戶實體（從 Platform DB，用於複製配置到租戶資料庫）
   * @param username 管理員帳號
   * @param password 管理員密碼（明文）
   * @param name 管理員名稱
   */
  async createAdminUserForTenant(
    tenantSlug: string,
    tenant: any, // Tenant entity from Platform DB
    username: string,
    password: string,
    name: string
  ): Promise<void> {
    const dbHost = this.configService.get<string>(
      "PLATFORM_DB_HOST",
      "localhost"
    );
    const dbPort = this.configService.get<number>("PLATFORM_DB_PORT", 5432);
    const dbUser = this.configService.get<string>(
      "PLATFORM_DB_USER",
      "postgres"
    );
    const dbPassword = this.configService.get<string>(
      "PLATFORM_DB_PASSWORD",
      "postgres"
    );
    const dbName = `tenant_${tenantSlug}`;

    this.logger.log(
      `開始為租戶 ${tenantSlug} (資料庫: ${dbName}) 創建配置和管理員用戶...`
    );

    let orm: MikroORM | null = null;

    try {
      // 動態創建 MikroORM 實例連接到租戶資料庫
      orm = await MikroORM.init<PostgreSqlDriver>({
        driver: PostgreSqlDriver,
        dbName,
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,

        // 租戶資料庫使用的 entities（使用 TenantConfig 取代 Tenant）
        entities: [
          TenantConfig,
          User,
          Agent,
          Customer,
          SystemFeeDistribution,
          RevenueDistribution,
          CommissionPayout,
        ],

        // 禁用元數據緩存以避免與平台資料庫的 Entity 類衝突
        metadataCache: {
          enabled: false,
        },

        // 開發設定
        debug: this.configService.get("NODE_ENV") !== "production",
      });

      // 全部使用原生 SQL，避免 Entity 元數據共享問題
      const connection = orm.em.getConnection();

      // 先驗證連接的資料庫
      const dbCheckResult = await connection.execute(
        "SELECT current_database() as dbname"
      );
      const currentDbName = (dbCheckResult as any[])[0]?.dbname;

      if (currentDbName !== dbName) {
        throw new Error(
          `資料庫連接不匹配！實際連接: ${currentDbName}, 預期: ${dbName}`
        );
      }

      this.logger.log(`已驗證資料庫連接: ${currentDbName}`);

      // ========== 1. 創建 tenant_config 記錄 ==========
      const configResult = await connection.execute(
        `SELECT "id" FROM "tenant_config" WHERE "id" = 1`
      );

      if (!configResult || (configResult as any[]).length === 0) {
        // 創建 tenant_config 記錄（id 固定為 1）
        const now = new Date().toISOString();
        await connection.execute(
          `INSERT INTO "tenant_config" (
            "id", "slug", "name", "system_fee_rate", "crypto_config", 
            "revenue_wallets", "system_wallets", "branding",
            "custom_domain", "custom_url", "created_at", "updated_at", "last_synced_at"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            1, // id 固定為 1
            tenant.slug,
            tenant.name,
            tenant.systemFeeRate || 10,
            JSON.stringify(tenant.cryptoConfig || {}),
            JSON.stringify(tenant.revenueWallets || []),
            JSON.stringify(tenant.systemWallets || null),
            JSON.stringify(tenant.branding || null),
            tenant.customDomain || null,
            tenant.customUrl || null,
            now,
            now,
            now,
          ]
        );
        this.logger.log(`在租戶資料庫中創建 tenant_config 記錄`);
      } else {
        this.logger.log(`在租戶資料庫中找到 tenant_config 記錄`);
      }

      // ========== 2. 創建管理員用戶 ==========
      // 自動生成 email（格式：{username}@{tenantSlug}.local）
      const email = `${username}@${tenantSlug}.local`;

      // 檢查用戶名和郵件是否已存在（在獨立的 Tenant DB 中不需要 tenant_id 過濾）
      const existingUserResult = await connection.execute(
        `SELECT "id" FROM "users" WHERE "username" = ? OR "email" = ?`,
        [username, email]
      );

      if (existingUserResult && (existingUserResult as any[]).length > 0) {
        throw new Error(
          `用戶名 "${username}" 或電子郵件 "${email}" 已存在於租戶資料庫中`
        );
      }

      // 使用 bcrypt 加密密碼
      const hashedPassword = await bcrypt.hash(password, 10);

      // 使用原生 SQL 插入用戶（不需要 tenant_id）
      const insertNow = new Date().toISOString();
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
          insertNow,
          insertNow,
          username,
          email,
          hashedPassword,
          name,
          UserRole.TENANT_ADMIN,
          UserStatus.ACTIVE,
          securityJson,
          false,
        ]
      );

      const userId =
        (insertResult as any).rows?.[0]?.id || (insertResult as any)[0]?.id;

      if (!userId) {
        throw new Error("無法獲取創建的用戶 ID");
      }

      // ========== 3. 為站長創建 Agent 記錄 ==========
      // 站長是 level 0 的代理，沒有上級，code 自動生成
      const agentCode = `AG${Math.floor(Math.random() * 1000000).toString().padStart(6, "0")}`;

      // 獲取租戶的代理佣金率（baseRate）
      const baseRate = tenant.cryptoConfig?.agentCommissionRate || 30.0;

      const commissionJson = JSON.stringify({
        baseRate,
        selfRate: 100.0, // 站長保留 100%（因為沒有上級）
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

      // 站長不需要錢包（或者可以後續設定）
      const walletJson = JSON.stringify(null);

      await connection.execute(
        `INSERT INTO "agents" (
          "created_at", "updated_at", "user_id", "name", "code",
          "parent_agent_id", "path", "level", "wallet", "commission",
          "status", "stats", "notes"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
        RETURNING "id"`,
        [
          insertNow,
          insertNow,
          userId,
          name,
          agentCode,
          null, // 站長沒有上級
          "root", // 站長的 path 是 "root"
          0, // 站長是 level 0
          walletJson,
          commissionJson,
          "active",
          statsJson,
          "系統自動創建的站長代理記錄",
        ]
      );

      this.logger.log(
        `租戶 ${tenantSlug} 的管理員用戶和站長代理記錄創建成功 (username: ${username}, user_id: ${userId}, database: ${dbName})`
      );
    } catch (error) {
      this.logger.error(
        `為租戶 ${tenantSlug} 創建管理員用戶失敗: ${error.message}`,
        error.stack
      );
      throw error;
    } finally {
      // 關閉 ORM 連接
      if (orm) {
        await orm.close(true);
      }
    }
  }

  /**
   * 同步租戶配置到 Tenant DB
   * 當 Platform DB 中的租戶配置更新時，需要同步到對應的 Tenant DB
   * @param tenantSlug 租戶 slug
   * @param tenant 租戶實體（從 Platform DB）
   */
  async syncTenantConfig(tenantSlug: string, tenant: any): Promise<void> {
    const dbHost = this.configService.get<string>(
      "PLATFORM_DB_HOST",
      "localhost"
    );
    const dbPort = this.configService.get<number>("PLATFORM_DB_PORT", 5432);
    const dbUser = this.configService.get<string>(
      "PLATFORM_DB_USER",
      "postgres"
    );
    const dbPassword = this.configService.get<string>(
      "PLATFORM_DB_PASSWORD",
      "postgres"
    );
    const dbName = `tenant_${tenantSlug}`;

    this.logger.log(`開始同步租戶 ${tenantSlug} 的配置到 Tenant DB...`);

    let orm: MikroORM | null = null;

    try {
      orm = await MikroORM.init<PostgreSqlDriver>({
        driver: PostgreSqlDriver,
        dbName,
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        entities: [TenantConfig],
        metadataCache: { enabled: false },
        debug: this.configService.get("NODE_ENV") !== "production",
      });

      const connection = orm.em.getConnection();
      const now = new Date().toISOString();

      // 更新 tenant_config 記錄
      await connection.execute(
        `UPDATE "tenant_config" SET
          "name" = ?,
          "system_fee_rate" = ?,
          "crypto_config" = ?,
          "revenue_wallets" = ?,
          "system_wallets" = ?,
          "branding" = ?,
          "custom_domain" = ?,
          "custom_url" = ?,
          "updated_at" = ?,
          "last_synced_at" = ?
        WHERE "id" = 1`,
        [
          tenant.name,
          tenant.systemFeeRate || 10,
          JSON.stringify(tenant.cryptoConfig || {}),
          JSON.stringify(tenant.revenueWallets || []),
          JSON.stringify(tenant.systemWallets || null),
          JSON.stringify(tenant.branding || null),
          tenant.customDomain || null,
          tenant.customUrl || null,
          now,
          now,
        ]
      );

      this.logger.log(`租戶 ${tenantSlug} 的配置同步成功`);
    } catch (error) {
      this.logger.error(
        `同步租戶 ${tenantSlug} 配置失敗: ${error.message}`,
        error.stack
      );
      throw error;
    } finally {
      if (orm) {
        await orm.close(true);
      }
    }
  }
}
