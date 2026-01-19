# Multi-Tenant Shared Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將 tenant-api、tenant-admin、agent-portal 改為多租戶共用部署架構

**Architecture:** 使用 Header 模式（X-Tenant-ID）識別租戶，懶加載 + LRU 管理 DB 連接池，Token 加入 tenantSlug 做雙重驗證

**Tech Stack:** NestJS, MikroORM, AsyncLocalStorage, React, Axios

---

## Phase 1: Tenant API 改造

### Task 1: 建立 TenantContext Service

**Files:**
- Create: `apps/tenant-api/src/common/tenant-context/tenant-context.service.ts`
- Create: `apps/tenant-api/src/common/tenant-context/tenant-context.module.ts`

**Step 1: 建立 TenantContext Service**

```typescript
// apps/tenant-api/src/common/tenant-context/tenant-context.service.ts
import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextData {
  tenantSlug: string;
}

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContextData>();

  run<T>(data: TenantContextData, callback: () => T): T {
    return this.storage.run(data, callback);
  }

  getTenantSlug(): string | undefined {
    return this.storage.getStore()?.tenantSlug;
  }

  getTenantSlugOrThrow(): string {
    const slug = this.getTenantSlug();
    if (!slug) {
      throw new Error('TenantContext not initialized');
    }
    return slug;
  }
}
```

**Step 2: 建立 TenantContext Module**

```typescript
// apps/tenant-api/src/common/tenant-context/tenant-context.module.ts
import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

@Global()
@Module({
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class TenantContextModule {}
```

**Step 3: 建立 index.ts**

```typescript
// apps/tenant-api/src/common/tenant-context/index.ts
export { TenantContextService, TenantContextData } from './tenant-context.service';
export { TenantContextModule } from './tenant-context.module';
```

**Step 4: Commit**

```bash
git add apps/tenant-api/src/common/tenant-context/
git commit -m "feat(tenant-api): add TenantContext service with AsyncLocalStorage"
```

---

### Task 2: 建立 TenantContext Middleware

**Files:**
- Create: `apps/tenant-api/src/common/tenant-context/tenant-context.middleware.ts`
- Modify: `apps/tenant-api/src/common/tenant-context/tenant-context.module.ts`

**Step 1: 建立 Middleware**

```typescript
// apps/tenant-api/src/common/tenant-context/tenant-context.middleware.ts
import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const tenantSlug = req.headers['x-tenant-id'] as string;

    if (!tenantSlug) {
      throw new BadRequestException('Missing X-Tenant-ID header');
    }

    // 驗證 tenantSlug 格式（只允許小寫字母、數字、連字號）
    if (!/^[a-z0-9-]+$/.test(tenantSlug)) {
      throw new BadRequestException('Invalid X-Tenant-ID format');
    }

    this.tenantContext.run({ tenantSlug }, () => {
      next();
    });
  }
}
```

**Step 2: 更新 Module exports**

```typescript
// apps/tenant-api/src/common/tenant-context/index.ts
export { TenantContextService, TenantContextData } from './tenant-context.service';
export { TenantContextModule } from './tenant-context.module';
export { TenantContextMiddleware } from './tenant-context.middleware';
```

**Step 3: Commit**

```bash
git add apps/tenant-api/src/common/tenant-context/
git commit -m "feat(tenant-api): add TenantContext middleware for X-Tenant-ID header"
```

---

### Task 3: 修改 JwtPayload 加入 tenantSlug

**Files:**
- Modify: `packages/auth/src/jwt.service.ts`

**Step 1: 更新 JwtPayload interface**

在 `packages/auth/src/jwt.service.ts` 中，修改 JwtPayload：

```typescript
export interface JwtPayload {
  sub: number; // user id
  email: string;
  role: string;
  tenantSlug?: string; // 新增：租戶識別（可選，向後兼容）
  type: "access" | "refresh"; // token 類型
}
```

**Step 2: Commit**

```bash
git add packages/auth/src/jwt.service.ts
git commit -m "feat(auth): add tenantSlug to JwtPayload"
```

---

### Task 4: 建立 TenantTokenGuard

**Files:**
- Create: `apps/tenant-api/src/common/guards/tenant-token.guard.ts`
- Create: `apps/tenant-api/src/common/guards/index.ts`

**Step 1: 建立 TenantTokenGuard**

```typescript
// apps/tenant-api/src/common/guards/tenant-token.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { TenantContextService } from '../tenant-context';

@Injectable()
export class TenantTokenGuard implements CanActivate {
  constructor(private readonly tenantContext: TenantContextService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 如果沒有 user（未認證的請求），跳過驗證
    if (!user) {
      return true;
    }

    const tenantFromHeader = this.tenantContext.getTenantSlug();
    const tenantFromToken = user.tenantSlug;

    // 如果 Token 中沒有 tenantSlug（舊 Token），允許通過但記錄警告
    if (!tenantFromToken) {
      console.warn('Token missing tenantSlug, skipping tenant validation');
      return true;
    }

    // 驗證 Header 與 Token 中的租戶一致
    if (tenantFromHeader !== tenantFromToken) {
      throw new ForbiddenException(
        'Tenant mismatch: token tenant does not match request tenant'
      );
    }

    return true;
  }
}
```

**Step 2: 建立 index.ts**

```typescript
// apps/tenant-api/src/common/guards/index.ts
export { TenantTokenGuard } from './tenant-token.guard';
```

**Step 3: Commit**

```bash
git add apps/tenant-api/src/common/guards/
git commit -m "feat(tenant-api): add TenantTokenGuard for tenant validation"
```

---

### Task 5: 建立 ConnectionManager Service

**Files:**
- Create: `apps/tenant-api/src/common/database/connection-manager.service.ts`
- Create: `apps/tenant-api/src/common/database/database.module.ts`
- Create: `apps/tenant-api/src/common/database/index.ts`

**Step 1: 建立 ConnectionManager**

```typescript
// apps/tenant-api/src/common/database/connection-manager.service.ts
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
```

**Step 2: 建立 Database Module**

```typescript
// apps/tenant-api/src/common/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConnectionManagerService } from './connection-manager.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ConnectionManagerService],
  exports: [ConnectionManagerService],
})
export class DatabaseModule {}
```

**Step 3: 建立 index.ts**

```typescript
// apps/tenant-api/src/common/database/index.ts
export { ConnectionManagerService } from './connection-manager.service';
export { DatabaseModule } from './database.module';
```

**Step 4: Commit**

```bash
git add apps/tenant-api/src/common/database/
git commit -m "feat(tenant-api): add ConnectionManager with lazy loading and LRU eviction"
```

---

### Task 6: 建立 TenantEntityManager Provider

**Files:**
- Create: `apps/tenant-api/src/common/database/tenant-entity-manager.provider.ts`
- Modify: `apps/tenant-api/src/common/database/database.module.ts`

**Step 1: 建立 Provider**

```typescript
// apps/tenant-api/src/common/database/tenant-entity-manager.provider.ts
import { Scope } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConnectionManagerService } from './connection-manager.service';
import { TenantContextService } from '../tenant-context';

export const TENANT_ENTITY_MANAGER = 'TENANT_ENTITY_MANAGER';

export const TenantEntityManagerProvider = {
  provide: TENANT_ENTITY_MANAGER,
  scope: Scope.REQUEST,
  useFactory: async (
    connectionManager: ConnectionManagerService,
    tenantContext: TenantContextService,
  ): Promise<EntityManager> => {
    const tenantSlug = tenantContext.getTenantSlugOrThrow();
    await connectionManager.getConnection(tenantSlug);
    return connectionManager.getEntityManager(tenantSlug);
  },
  inject: [ConnectionManagerService, TenantContextService],
};
```

**Step 2: 更新 Database Module**

```typescript
// apps/tenant-api/src/common/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConnectionManagerService } from './connection-manager.service';
import { TenantEntityManagerProvider, TENANT_ENTITY_MANAGER } from './tenant-entity-manager.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ConnectionManagerService, TenantEntityManagerProvider],
  exports: [ConnectionManagerService, TENANT_ENTITY_MANAGER],
})
export class DatabaseModule {}
```

**Step 3: 更新 index.ts**

```typescript
// apps/tenant-api/src/common/database/index.ts
export { ConnectionManagerService } from './connection-manager.service';
export { DatabaseModule } from './database.module';
export { TenantEntityManagerProvider, TENANT_ENTITY_MANAGER } from './tenant-entity-manager.provider';
```

**Step 4: Commit**

```bash
git add apps/tenant-api/src/common/database/
git commit -m "feat(tenant-api): add TenantEntityManager provider with request scope"
```

---

### Task 7: 修改 AppModule 整合多租戶支持

**Files:**
- Modify: `apps/tenant-api/src/app.module.ts`

**Step 1: 更新 AppModule**

```typescript
// apps/tenant-api/src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { RevenueWalletsModule } from "./modules/revenue-wallets/revenue-wallets.module";
import { AgentsModule } from "./modules/agents/agents.module";
import { ContractsModule } from "./modules/contracts/contracts.module";
import { TransactionsModule } from "./modules/transactions/transactions.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { TenantContextModule, TenantContextMiddleware } from "./common/tenant-context";
import { DatabaseModule } from "./common/database";

@Module({
  imports: [
    // 環境變數配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    // 多租戶 Context 模組
    TenantContextModule,

    // 多租戶資料庫模組
    DatabaseModule,

    // 功能模組
    AuthModule,
    RevenueWalletsModule,
    AgentsModule,
    ContractsModule,
    TransactionsModule,
    CustomersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes('*'); // 所有路由都需要租戶識別
  }
}
```

**Step 2: Commit**

```bash
git add apps/tenant-api/src/app.module.ts
git commit -m "refactor(tenant-api): integrate multi-tenant modules into AppModule"
```

---

### Task 8: 修改 AuthService 加入 tenantSlug 到 Token

**Files:**
- Modify: `apps/tenant-api/src/modules/auth/auth.service.ts`

**Step 1: 注入 TenantContextService 並更新 Token 生成**

```typescript
// 在 AuthService constructor 中注入 TenantContextService
import { TenantContextService } from "../../common/tenant-context";

// constructor 加入
constructor(
  // ... 原有的依賴
  private readonly tenantContextService: TenantContextService,
) {
  super();
  // ...
}

// 修改 login 方法中的 token 生成
async login(loginDto: LoginDto): Promise<AuthResponseDto> {
  const tenantSlug = this.tenantContextService.getTenantSlugOrThrow();
  const result = await this.doLogin(loginDto.username, loginDto.password);

  // 重新生成包含 tenantSlug 的 token
  const tokenPair = this.jwtService.generateTokenPair({
    sub: result.user.id,
    email: result.user.email,
    role: result.user.role,
    tenantSlug: tenantSlug,
  });

  return {
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
    expiresIn: tokenPair.expiresIn,
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
    },
  };
}

// 同樣修改 agentLogin 方法
async agentLogin(username: string, password: string): Promise<AuthResponseDto> {
  const tenantSlug = this.tenantContextService.getTenantSlugOrThrow();
  // ... 驗證邏輯 ...

  const tokenPair = this.jwtService.generateTokenPair({
    sub: user.id,
    email: user.email,
    role: user.role,
    tenantSlug: tenantSlug,
  });

  // ... 返回結果 ...
}
```

**Step 2: Commit**

```bash
git add apps/tenant-api/src/modules/auth/auth.service.ts
git commit -m "feat(tenant-api): add tenantSlug to JWT tokens on login"
```

---

## Phase 2: 前端改造

### Task 9: 建立前端 TenantContext

**Files:**
- Create: `packages/api-client/src/tenant/tenant-context.ts`

**Step 1: 建立 TenantContext**

```typescript
// packages/api-client/src/tenant/tenant-context.ts
export interface TenantInfo {
  slug: string;
  name: string;
  branding?: {
    logo?: string;
    primaryColor?: string;
  };
}

class TenantContextClass {
  private tenantInfo: TenantInfo | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async init(platformApiUrl: string): Promise<TenantInfo> {
    if (this.initialized && this.tenantInfo) {
      return this.tenantInfo;
    }

    if (this.initPromise) {
      await this.initPromise;
      return this.tenantInfo!;
    }

    this.initPromise = this.doInit(platformApiUrl);
    await this.initPromise;
    return this.tenantInfo!;
  }

  private async doInit(platformApiUrl: string): Promise<void> {
    const domain = window.location.hostname;

    try {
      const response = await fetch(
        `${platformApiUrl}/api/tenants/by-domain/${encodeURIComponent(domain)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to identify tenant for domain: ${domain}`);
      }

      const result = await response.json();
      const data = result.data || result;

      this.tenantInfo = {
        slug: data.slug,
        name: data.name,
        branding: data.branding,
      };
      this.initialized = true;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  getSlug(): string {
    if (!this.tenantInfo) {
      throw new Error('TenantContext not initialized. Call init() first.');
    }
    return this.tenantInfo.slug;
  }

  getInfo(): TenantInfo | null {
    return this.tenantInfo;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // 用於測試或特殊情況：手動設定租戶
  setTenant(info: TenantInfo): void {
    this.tenantInfo = info;
    this.initialized = true;
  }

  reset(): void {
    this.tenantInfo = null;
    this.initialized = false;
    this.initPromise = null;
  }
}

export const TenantContext = new TenantContextClass();
```

**Step 2: Commit**

```bash
git add packages/api-client/src/tenant/tenant-context.ts
git commit -m "feat(api-client): add TenantContext for frontend tenant identification"
```

---

### Task 10: 修改 TenantApiClient 支持 X-Tenant-ID

**Files:**
- Modify: `packages/api-client/src/tenant/client.ts`

**Step 1: 更新 TenantApiClient**

在 constructor 的 request interceptor 中加入 X-Tenant-ID：

```typescript
// packages/api-client/src/tenant/client.ts
import { TenantContext } from './tenant-context';

// 在 TenantApiConfig interface 中新增
export interface TenantApiConfig {
  baseURL: string;
  timeout?: number;
  tenantSlug?: string; // 可選：手動指定租戶（用於測試）
}

// 在 constructor 中修改 request interceptor
this.client.interceptors.request.use(
  (config) => {
    // 添加 token
    if (this.accessToken) {
      config.headers.Authorization = `Bearer ${this.accessToken}`;
    }

    // 添加 X-Tenant-ID
    const tenantSlug = this.tenantSlug || TenantContext.getSlug();
    if (tenantSlug) {
      config.headers['X-Tenant-ID'] = tenantSlug;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 在 class 中新增 tenantSlug 屬性
private tenantSlug: string | null = null;

// 新增方法
setTenantSlug(slug: string | null): void {
  this.tenantSlug = slug;
}
```

**Step 2: 更新 index.ts exports**

```typescript
// packages/api-client/src/index.ts
// 新增 export
export { TenantContext, TenantInfo } from './tenant/tenant-context';
```

**Step 3: Commit**

```bash
git add packages/api-client/src/tenant/client.ts packages/api-client/src/index.ts
git commit -m "feat(api-client): add X-Tenant-ID header support to TenantApiClient"
```

---

### Task 11: 修改 tenant-admin App.tsx

**Files:**
- Modify: `apps/tenant-admin/src/App.tsx`

**Step 1: 加入租戶初始化邏輯**

```typescript
// apps/tenant-admin/src/App.tsx
import { useState, useEffect } from "react";
import { TenantContext, createTenantApiClient } from "@saas-platform/api-client";

// ... 其他 imports ...

const platformApiUrl = import.meta.env.VITE_PLATFORM_API_URL || "http://localhost:3000";
const tenantApiUrl = import.meta.env.VITE_TENANT_API_URL || "http://localhost:3001";

function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // 1. 初始化租戶 Context
        await TenantContext.init(platformApiUrl);

        // 2. 初始化 API 客戶端
        createTenantApiClient(tenantApiUrl);

        setReady(true);
      } catch (err) {
        console.error('Failed to initialize tenant:', err);
        setError(err instanceof Error ? err.message : 'Failed to identify tenant');
      }
    };

    init();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">無法識別租戶</h1>
          <p className="text-gray-600">{error}</p>
          <p className="text-gray-500 mt-2 text-sm">
            請確認域名設定正確，或聯繫系統管理員。
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">載入中...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* ... 原有的 JSX ... */}
    </BrowserRouter>
  );
}
```

**Step 2: Commit**

```bash
git add apps/tenant-admin/src/App.tsx
git commit -m "feat(tenant-admin): add tenant initialization on app startup"
```

---

### Task 12: 修改 agent-portal App.tsx

**Files:**
- Modify: `apps/agent-portal/src/App.tsx`

**Step 1: 加入租戶初始化邏輯**

與 Task 11 類似，在 agent-portal 的 App.tsx 中加入相同的初始化邏輯。

**Step 2: Commit**

```bash
git add apps/agent-portal/src/App.tsx
git commit -m "feat(agent-portal): add tenant initialization on app startup"
```

---

## Phase 3: 服務模組改造

### Task 13: 修改各功能模組使用 TenantEntityManager

**Files:**
- Modify: `apps/tenant-api/src/modules/customers/customers.module.ts`
- Modify: `apps/tenant-api/src/modules/customers/customers.service.ts`
- (其他模組類似)

**說明:** 這個 Task 需要修改所有使用 `@InjectRepository` 的模組，改為使用 `TENANT_ENTITY_MANAGER`。由於改動較大，建議逐個模組進行。

**Step 1: 修改 Service 使用 TENANT_ENTITY_MANAGER**

```typescript
// 範例：customers.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { TENANT_ENTITY_MANAGER } from '../../common/database';
import { Customer } from '@saas-platform/database';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(TENANT_ENTITY_MANAGER)
    private readonly em: EntityManager,
  ) {}

  async findAll() {
    return this.em.find(Customer, {});
  }

  // ... 其他方法
}
```

**Step 2: 修改 Module 移除 MikroOrmModule.forFeature**

```typescript
// customers.module.ts
import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  // 移除 MikroOrmModule.forFeature([Customer])
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
```

**Step 3: 逐個模組 Commit**

```bash
git add apps/tenant-api/src/modules/customers/
git commit -m "refactor(tenant-api): migrate customers module to use TenantEntityManager"
```

---

## Phase 4: 環境配置

### Task 14: 更新環境變數配置

**Files:**
- Modify: `apps/tenant-api/.env.example`
- Modify: `apps/tenant-admin/.env.example`
- Modify: `apps/agent-portal/.env.example`

**Step 1: 更新 tenant-api .env.example**

```bash
# 移除 TENANT_SLUG（不再需要）
# TENANT_SLUG=test001

# 保留資料庫連線設定（用於所有租戶）
TENANT_DB_HOST=localhost
TENANT_DB_PORT=5432
TENANT_DB_USER=postgres
TENANT_DB_PASSWORD=postgres
```

**Step 2: 更新 tenant-admin .env.example**

```bash
VITE_PLATFORM_API_URL=http://localhost:3000
VITE_TENANT_API_URL=http://localhost:3001
```

**Step 3: Commit**

```bash
git add apps/tenant-api/.env.example apps/tenant-admin/.env.example apps/agent-portal/.env.example
git commit -m "docs: update env examples for multi-tenant architecture"
```

---

## 實現順序建議

1. **先完成 Task 1-6**：建立基礎設施（TenantContext, ConnectionManager）
2. **完成 Task 7-8**：修改認證流程
3. **完成 Task 9-12**：前端改造
4. **完成 Task 13**：逐個模組遷移
5. **完成 Task 14**：環境配置

## 測試檢查點

每個 Phase 完成後，執行以下測試：

```bash
# Phase 1 完成後
pnpm --filter @saas-platform/tenant-api build

# Phase 2 完成後
pnpm --filter @saas-platform/tenant-admin build
pnpm --filter @saas-platform/agent-portal build

# 全部完成後
pnpm build
pnpm test
```
