import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { MikroORM, EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import {
  TenantConfig,
  TenantUser,
  Agent,
  AgentCommissionSetting,
  Customer,
  SystemFeeDistribution,
  RevenueDistribution,
  CommissionPayout,
} from '@saas-platform/database';

interface PoolEntry {
  orm: MikroORM;
  lastUsed: number;
}

@Injectable()
export class ConnectionManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(ConnectionManagerService.name);
  private readonly pools = new Map<string, PoolEntry>();
  private readonly lruOrder: string[] = [];

  private readonly config = {
    maxPools: 100,
    poolMin: 2,
    poolMax: 20,
    idleTimeout: 30000,
  };

  constructor(private readonly configService: ConfigService) {}

  async getConnection(tenantSlug: string): Promise<MikroORM> {
    // 1. 已存在：更新 LRU
    const existing = this.pools.get(tenantSlug);
    if (existing) {
      existing.lastUsed = Date.now();
      this.updateLRU(tenantSlug);
      return existing.orm;
    }

    // 2. 檢查是否需要淘汰
    if (this.pools.size >= this.config.maxPools) {
      await this.evictLRU();
    }

    // 3. 建立新連接池
    this.logger.log(`Creating connection pool for tenant: ${tenantSlug}`);

    const orm = await MikroORM.init({
      driver: require('@mikro-orm/postgresql').PostgreSqlDriver,
      dbName: `tenant_${tenantSlug}`,
      host: this.configService.get('TENANT_DB_HOST', 'localhost'),
      port: this.configService.get('TENANT_DB_PORT', 5432),
      user: this.configService.get('TENANT_DB_USER', 'postgres'),
      password: this.configService.get('TENANT_DB_PASSWORD', 'postgres'),
      entities: [
        TenantConfig,
        TenantUser,
        Agent,
        AgentCommissionSetting,
        Customer,
        SystemFeeDistribution,
        RevenueDistribution,
        CommissionPayout,
      ],
      pool: {
        min: this.config.poolMin,
        max: this.config.poolMax,
      },
      discovery: {
        warnWhenNoEntities: true,
        requireEntitiesArray: true,
        disableDynamicFileAccess: true,
      },
    });

    this.pools.set(tenantSlug, { orm, lastUsed: Date.now() });
    this.lruOrder.push(tenantSlug);

    return orm;
  }

  getEntityManager(tenantSlug: string): EntityManager {
    const entry = this.pools.get(tenantSlug);
    if (!entry) {
      throw new Error(`No connection pool for tenant: ${tenantSlug}`);
    }
    return entry.orm.em.fork();
  }

  private updateLRU(tenantSlug: string): void {
    const index = this.lruOrder.indexOf(tenantSlug);
    if (index > -1) {
      this.lruOrder.splice(index, 1);
    }
    this.lruOrder.push(tenantSlug);
  }

  private async evictLRU(): Promise<void> {
    const oldest = this.lruOrder.shift();
    if (oldest) {
      this.logger.log(`Evicting connection pool for tenant: ${oldest}`);
      const entry = this.pools.get(oldest);
      if (entry) {
        await entry.orm.close();
        this.pools.delete(oldest);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing all connection pools...');
    for (const [tenantSlug, entry] of this.pools) {
      this.logger.log(`Closing pool for: ${tenantSlug}`);
      await entry.orm.close();
    }
    this.pools.clear();
  }

  // 監控用：取得當前連接池狀態
  getPoolStats(): { totalPools: number; tenants: string[] } {
    return {
      totalPools: this.pools.size,
      tenants: Array.from(this.pools.keys()),
    };
  }
}
