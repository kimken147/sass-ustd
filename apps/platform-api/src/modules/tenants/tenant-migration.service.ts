import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MikroORM, EntityManager } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { Migrator } from "@mikro-orm/migrations";
import * as path from "path";
import * as bcrypt from "bcrypt";
import {
  Tenant,
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
    // 使用 __dirname 從當前文件位置計算相對路徑到項目根目錄
    // tenant-migration.service.ts 在 apps/platform-api/src/modules/tenants/
    // 項目根目錄在 ../../../../../ (向上 5 層，從 src/modules/tenants 到根目錄)
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

        // 租戶資料庫使用的 entities（與 tenant-api 一致）
        entities: [
          Tenant,
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
   * 為指定的租戶資料庫創建管理員用戶
   * @param tenantSlug 租戶 slug
   * @param tenant 租戶實體（從 Platform DB，用於複製到租戶資料庫）
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
      `開始為租戶 ${tenantSlug} (資料庫: ${dbName}) 創建管理員用戶...`
    );

    let orm: MikroORM | null = null;

    try {
      // 動態創建 MikroORM 實例連接到租戶資料庫
      // 使用唯一的 contextName 和禁用元數據緩存以避免與平台資料庫的 Entity 類衝突
      orm = await MikroORM.init<PostgreSqlDriver>({
        driver: PostgreSqlDriver,
        dbName,
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,

        // 租戶資料庫使用的 entities
        entities: [
          Tenant,
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

      // 使用原生 SQL 檢查租戶記錄是否存在
      const tenantResult = await connection.execute(
        `SELECT "id" FROM "tenants" WHERE "slug" = ?`,
        [tenantSlug]
      );

      let tenantId: number;

      if (!tenantResult || (tenantResult as any[]).length === 0) {
        // 如果沒有租戶記錄，創建一個
        const now = new Date().toISOString();
        const insertTenantResult = await connection.execute(
          `INSERT INTO "tenants" (
            "created_at", "updated_at", "name", "slug", "status", "plan",
            "revenue_wallets", "system_fee_rate", "crypto_config", "custom_domain"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING "id"`,
          [
            now,
            now,
            tenant.name,
            tenant.slug,
            tenant.status || "active",
            tenant.plan || "trial",
            JSON.stringify(tenant.revenueWallets || []),
            tenant.systemFeeRate || 10,
            JSON.stringify(tenant.cryptoConfig || {}),
            tenant.customDomain || null,
          ]
        );
        tenantId = (insertTenantResult as any[])[0]?.id;
        this.logger.log(`在租戶資料庫中創建租戶記錄，ID: ${tenantId}`);
      } else {
        tenantId = (tenantResult as any[])[0]?.id;
        this.logger.log(`在租戶資料庫中找到租戶記錄，ID: ${tenantId}`);
      }

      // 自動生成 email（格式：{username}@{tenantSlug}.local）
      const email = `${username}@${tenantSlug}.local`;

      // 檢查用戶名和郵件是否已存在
      const existingUserResult = await connection.execute(
        `SELECT "id" FROM "users" WHERE ("username" = ? OR "email" = ?) AND "tenant_id" = ?`,
        [username, email, tenantId]
      );

      if (existingUserResult && (existingUserResult as any[]).length > 0) {
        throw new Error(
          `用戶名 "${username}" 或電子郵件 "${email}" 已存在於租戶資料庫中`
        );
      }

      // 使用 bcrypt 加密密碼
      const hashedPassword = await bcrypt.hash(password, 10);

      // 使用原生 SQL 插入用戶（MikroORM 使用 ? 佔位符）
      const insertNow = new Date().toISOString();
      const securityJson = JSON.stringify({
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
      });

      const insertResult = await connection.execute(
        `INSERT INTO "users" (
          "created_at", "updated_at", "username", "email", "password", 
          "name", "role", "status", "tenant_id", "security", "email_verified"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
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
          tenantId,
          securityJson,
          false,
        ]
      );

      const userId =
        (insertResult as any).rows?.[0]?.id || (insertResult as any)[0]?.id;

      if (!userId) {
        throw new Error("無法獲取創建的用戶 ID");
      }

      // 驗證用戶確實被創建在租戶資料庫中
      const verifyResult = await connection.execute(
        `SELECT * FROM "users" WHERE "id" = ? AND "tenant_id" = ?`,
        [userId, tenantId]
      );

      if (!verifyResult || (verifyResult as any[]).length === 0) {
        throw new Error(
          `用戶創建後驗證失敗：無法在租戶資料庫 ${dbName} 中找到創建的用戶 (id: ${userId})`
        );
      }

      this.logger.log(
        `租戶 ${tenantSlug} 的管理員用戶創建成功 (username: ${username}, user_id: ${userId}, database: ${dbName})`
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
}
