import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  MikroORM,
  EntityManager,
  PostgreSqlDriver,
} from "@mikro-orm/postgresql";
import {
  Customer,
  CommissionPayout,
  RevenueDistribution,
  SystemFeeDistribution,
} from "@saas-platform/database";

/**
 * 租戶資料庫連接服務
 * 使用 MikroORM 動態連接到各個租戶的獨立資料庫
 */
@Injectable()
export class TenantDbConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantDbConnectionService.name);
  private readonly ormCache = new Map<string, any>();
  private readonly emCache = new Map<string, any>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * 獲取租戶資料庫的 EntityManager
   * @param tenantSlug 租戶 slug
   * @returns EntityManager 實例
   */
  async getEntityManager(tenantSlug: string): Promise<any> {
    // 檢查緩存
    const cachedEm = this.emCache.get(tenantSlug);
    if (cachedEm) {
      return cachedEm;
    }

    // 獲取或創建 MikroORM 實例
    let orm = this.ormCache.get(tenantSlug);
    if (!orm || !orm.isConnected()) {
      orm = await this.createConnection(tenantSlug);
      this.ormCache.set(tenantSlug, orm);
    }

    const em = orm.em.fork();
    this.emCache.set(tenantSlug, em);
    return em;
  }

  /**
   * 創建租戶資料庫連接
   * @param tenantSlug 租戶 slug
   * @returns MikroORM 實例
   */
  private async createConnection(tenantSlug: string): Promise<any> {
    const dbName = `tenant_${tenantSlug}`;

    try {
      const orm = await MikroORM.init<PostgreSqlDriver>({
        driver: PostgreSqlDriver,
        dbName,
        host: this.configService.get<string>("PLATFORM_DB_HOST", "localhost"),
        port: this.configService.get<number>("PLATFORM_DB_PORT", 5432),
        user: this.configService.get<string>("PLATFORM_DB_USER", "postgres"),
        password: this.configService.get<string>(
          "PLATFORM_DB_PASSWORD",
          "postgres"
        ),
        entities: [
          Customer,
          CommissionPayout,
          RevenueDistribution,
          SystemFeeDistribution,
        ],
        debug: this.configService.get("NODE_ENV") !== "production",
        // 連接池配置
        pool: {
          min: 1,
          max: 5,
        },
      });

      this.logger.debug(`已連接到租戶資料庫: ${dbName}`);
      return orm;
    } catch (error) {
      this.logger.error(
        `連接租戶資料庫失敗: ${dbName}, 錯誤: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * 執行查詢並返回結果
   * @param tenantSlug 租戶 slug
   * @param query SQL 查詢語句
   * @param params 查詢參數
   * @returns 查詢結果
   */
  async query<T = any>(
    tenantSlug: string,
    query: string,
    params?: any[]
  ): Promise<T[]> {
    const em = await this.getEntityManager(tenantSlug);
    try {
      // 使用 MikroORM 的 execute 方法執行原始 SQL
      const result = await em.getConnection().execute(query, params || []);
      return result as T[];
    } catch (error) {
      this.logger.error(
        `查詢租戶資料庫失敗: tenant_${tenantSlug}, 錯誤: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * 關閉指定租戶的連接
   * @param tenantSlug 租戶 slug
   */
  async closeConnection(tenantSlug: string): Promise<void> {
    const orm = this.ormCache.get(tenantSlug);
    if (orm && orm.isConnected()) {
      try {
        await orm.close();
        this.ormCache.delete(tenantSlug);
        this.emCache.delete(tenantSlug);
        this.logger.debug(`已關閉租戶資料庫連接: tenant_${tenantSlug}`);
      } catch (error) {
        this.logger.error(
          `關閉租戶資料庫連接失敗: tenant_${tenantSlug}, 錯誤: ${error.message}`
        );
      }
    }
  }

  /**
   * 關閉所有連接
   */
  async onModuleDestroy(): Promise<void> {
    const closePromises = Array.from(this.ormCache.entries()).map(
      async ([tenantSlug, orm]) => {
        if (orm.isConnected()) {
          try {
            await orm.close();
            this.logger.debug(`已關閉租戶資料庫連接: tenant_${tenantSlug}`);
          } catch (error) {
            this.logger.error(
              `關閉租戶資料庫連接失敗: tenant_${tenantSlug}, 錯誤: ${error.message}`
            );
          }
        }
      }
    );
    await Promise.all(closePromises);
    this.ormCache.clear();
    this.emCache.clear();
  }
}
