# 多租戶共用架構設計

> 建立日期：2026-01-20

## 概述

將 tenant-api、tenant-admin、agent-portal 從「每租戶獨立部署」改為「多租戶共用部署」，以降低營運成本並簡化部署流程。

## 設計決策摘要

| 項目 | 決策 |
|------|------|
| 租戶識別方式 | Header 模式（X-Tenant-ID） |
| 域名對應表來源 | 從 Platform API 查詢 |
| DB 連接池策略 | 懶加載 + LRU 快取 + 動態調整 |
| Token 安全性 | Token 加入 tenantSlug + 後端雙重驗證 |
| 首次冷啟動延遲 | 可接受（~100-300ms） |

## 整體架構

```
租戶管理員訪問 admin.brand-a.com
        │
        ▼
┌─────────────────────┐
│  tenant-admin       │  (共用實例)
│  • 透過域名查 Platform API 取得 tenantSlug
│  • 所有 API 請求帶 Header: X-Tenant-ID: tenant-a
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  tenant-api         │  (共用實例)
│  • 從 Header 取得 tenantSlug
│  • 驗證 Token 中的 tenantSlug 一致
│  • 動態取得/建立對應的 DB 連接池
│  • 執行查詢
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  PostgreSQL         │  (單一 Server，多個 DB)
│  ├── tenant_a       │
│  ├── tenant_b       │
│  └── tenant_c       │
└─────────────────────┘
```

## Tenant API 改造

### 新增元件結構

```
apps/tenant-api/src/
├── common/
│   ├── tenant-context/
│   │   ├── tenant-context.module.ts
│   │   ├── tenant-context.service.ts    # 存儲當前請求的租戶資訊
│   │   └── tenant-context.middleware.ts # 從 Header 提取租戶
│   │
│   ├── database/
│   │   ├── database.module.ts
│   │   ├── connection-manager.service.ts # 管理多租戶連接池
│   │   └── tenant-entity-manager.ts      # 提供租戶專屬的 EntityManager
│   │
│   └── guards/
│       └── tenant-token.guard.ts         # 驗證 Token 與 Header 一致
```

### TenantContextMiddleware

```typescript
@Injectable()
export class TenantContextMiddleware {
  use(req: Request, res: Response, next: Function) {
    const tenantSlug = req.headers['x-tenant-id'];
    if (!tenantSlug) throw new BadRequestException('Missing X-Tenant-ID');

    // 存入 AsyncLocalStorage 或 cls-hooked
    TenantContext.set(tenantSlug);
    next();
  }
}
```

### TenantTokenGuard

```typescript
@Injectable()
export class TenantTokenGuard {
  canActivate(context: ExecutionContext): boolean {
    const tenantFromHeader = TenantContext.get();
    const tenantFromToken = jwt.tenantSlug;

    if (tenantFromHeader !== tenantFromToken) {
      throw new ForbiddenException('Tenant mismatch');
    }
    return true;
  }
}
```

## 連接池管理器

### ConnectionManagerService

```typescript
@Injectable()
export class ConnectionManagerService implements OnModuleDestroy {
  // 連接池快取 (tenantSlug → MikroORM)
  private pools = new Map<string, MikroORM>();

  // LRU 追蹤 (最近使用順序)
  private lruOrder: string[] = [];

  // 配置
  private readonly config = {
    maxPools: 100,           // 最多保留 100 個連接池
    poolMin: 2,              // 每池最小連接數
    poolMax: 20,             // 每池最大連接數
    idleTimeout: 30000,      // 閒置連接超時 (ms)
  };

  async getConnection(tenantSlug: string): Promise<MikroORM> {
    // 1. 已存在：更新 LRU，返回
    if (this.pools.has(tenantSlug)) {
      this.updateLRU(tenantSlug);
      return this.pools.get(tenantSlug);
    }

    // 2. 不存在：檢查是否需要淘汰
    if (this.pools.size >= this.config.maxPools) {
      await this.evictLRU();
    }

    // 3. 建立新連接池
    const orm = await MikroORM.init({
      dbName: `tenant_${tenantSlug}`,
      pool: {
        min: this.config.poolMin,
        max: this.config.poolMax,
      },
      // ... 其他配置
    });

    this.pools.set(tenantSlug, orm);
    this.lruOrder.push(tenantSlug);

    return orm;
  }

  private async evictLRU(): Promise<void> {
    const oldest = this.lruOrder.shift();
    if (oldest) {
      const orm = this.pools.get(oldest);
      await orm?.close();
      this.pools.delete(oldest);
    }
  }

  async onModuleDestroy(): Promise<void> {
    // 關閉所有連接池
    for (const orm of this.pools.values()) {
      await orm.close();
    }
  }
}
```

### 效能預估

| 租戶數 | 活躍池數 | 記憶體用量 | 說明 |
|--------|---------|-----------|------|
| 10 | 10 | ~100-200 MB | 全部活躍 |
| 50 | 50 | ~500 MB - 1 GB | 全部活躍 |
| 200 | 100 (上限) | ~1-2 GB | LRU 淘汰 100 個不活躍的 |

## 前端改造

### 租戶識別流程

```typescript
// lib/tenant-context.ts
class TenantContext {
  private static tenantSlug: string | null = null;
  private static tenantConfig: TenantConfig | null = null;

  // 應用啟動時初始化
  static async init(): Promise<void> {
    const domain = window.location.hostname;

    // 從 Platform API 查詢租戶
    const response = await fetch(
      `${PLATFORM_API_URL}/api/tenants/by-domain/${domain}`
    );

    if (!response.ok) {
      throw new Error('無法識別租戶，請確認域名設定');
    }

    const data = await response.json();
    this.tenantSlug = data.slug;
    this.tenantConfig = data;
  }

  static getSlug(): string {
    if (!this.tenantSlug) throw new Error('Tenant not initialized');
    return this.tenantSlug;
  }
}
```

### API Client 改造

```typescript
// lib/api-client.ts
const apiClient = axios.create({
  baseURL: TENANT_API_URL,
});

// 攔截器：自動加入 X-Tenant-ID
apiClient.interceptors.request.use((config) => {
  config.headers['X-Tenant-ID'] = TenantContext.getSlug();
  return config;
});
```

### 應用入口改造

```typescript
// App.tsx 或 _app.tsx
function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    TenantContext.init()
      .then(() => setReady(true))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <TenantErrorPage message={error} />;
  if (!ready) return <LoadingScreen />;

  return <RouterProvider router={router} />;
}
```

## Token 結構改造

### JwtPayload 新增 tenantSlug

```typescript
// packages/auth/src/jwt.service.ts

export interface JwtPayload {
  sub: number;          // user id
  email: string;
  role: string;
  tenantSlug: string;   // 新增：租戶識別
  type: "access" | "refresh";
}
```

### 請求驗證流程

```
請求進入
    │
    ▼
┌─────────────────────────────┐
│ TenantContextMiddleware     │
│ • 從 Header 取得 tenantSlug │
│ • 存入 Context              │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ JwtAuthGuard                │
│ • 驗證 Token 有效性         │
│ • 解析 payload              │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ TenantTokenGuard            │
│ • Header tenantSlug         │
│   vs Token tenantSlug       │
│ • 不一致 → 403 Forbidden    │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ Controller / Service        │
│ • 安全執行業務邏輯          │
└─────────────────────────────┘
```

### 安全性保障

| 攻擊場景 | 防護機制 |
|---------|---------|
| 偽造 X-Tenant-ID Header | Token 中的 tenantSlug 不符，403 |
| 用 A 租戶 Token 存取 B 租戶 | Header vs Token 不符，403 |
| 竄改 Token | JWT 簽名驗證失敗，401 |

## 效能分析與潛在問題

### 效能影響評估

| 項目 | 影響 | 說明 |
|------|------|------|
| 首次請求延遲 | +100-300ms | 懶加載建立連接池的冷啟動時間 |
| 後續請求 | 無影響 | 連接池已建立，與原架構相同 |
| 記憶體使用 | 可控 | LRU 限制最大連接池數量 |
| CPU 使用 | 略增 | Middleware 解析 Header、Guard 驗證 |

### 潛在問題與解決方案

#### 問題 1：租戶 DB 不存在

- **場景**：惡意請求帶入不存在的 X-Tenant-ID
- **解決**：ConnectionManager 建立連接前，先查 Platform API 驗證租戶，或維護一個租戶白名單快取（定期從 Platform 同步）

#### 問題 2：連接池耗盡

- **場景**：某租戶流量暴增，連接池 max=20 不夠用
- **解決**：
  - 監控連接池使用率，告警通知
  - AWS Auto Scaling 增加 tenant-api 實例
  - 考慮為大租戶提供獨立部署選項

#### 問題 3：跨實例的連接池不共享

- **場景**：多個 tenant-api 實例，每個都建立自己的連接池
- **影響**：DB 總連接數 = 實例數 × 每實例連接池數
- **解決**：
  - 設定 PostgreSQL max_connections 足夠大
  - 或使用 PgBouncer 做連接池代理

### 監控指標建議

```typescript
const metrics = {
  // 連接池
  'pool.active_count': '活躍連接池數量',
  'pool.total_connections': '總連接數',
  'pool.wait_time': '等待連接的時間',

  // 請求
  'request.cold_start_count': '冷啟動次數',
  'request.cold_start_duration': '冷啟動耗時',

  // LRU
  'lru.eviction_count': '淘汰次數',
};
```

## 實現步驟概覽

1. **Phase 1：Tenant API 改造**
   - 建立 TenantContext 模組
   - 建立 ConnectionManager
   - 修改 JWT Token 結構
   - 新增 TenantTokenGuard

2. **Phase 2：前端改造**
   - tenant-admin 加入租戶識別邏輯
   - agent-portal 加入租戶識別邏輯
   - API Client 加入 X-Tenant-ID Header

3. **Phase 3：部署與測試**
   - 更新部署配置
   - 多租戶整合測試
   - 效能測試

4. **Phase 4：監控與優化**
   - 加入監控指標
   - 根據實際負載調整參數
