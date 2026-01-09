# 系統錢包指派同步策略

## 問題背景

由於 Platform DB 和 Tenant DB 是分開的，當 tenant-api 在運作時需要讀取系統錢包的指派資訊（包括錢包地址、比例等）來進行分潤計算，但這些資訊存儲在 Platform DB 中。

## 方案比較

### 方案 1：在 Tenant DB 中複製完整系統錢包資訊（推薦 ⭐）

**核心思路**：在創建/更新租戶時，將系統錢包的完整資訊（包括地址、名稱等）複製到 Tenant DB 中。

#### 實作方式

1. **擴展 SystemWalletAssignment 介面**：
```typescript
// packages/database/src/entities/tenant.entity.ts

export interface SystemWalletAssignment {
  walletId: number;             // 系統商錢包 ID（用於關聯）
  address: string;              // 錢包地址（複製）
  name: string;                 // 錢包名稱（複製）
  chain: string;                // 區塊鏈（複製）
  percentage: number;           // 分潤比例（整數，%）
  syncedAt: Date;              // 同步時間
}
```

2. **在創建/更新租戶時填充完整資訊**：
```typescript
// apps/platform-api/src/modules/tenants/tenants.service.ts

async create(createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
  // ... 現有驗證邏輯 ...

  // 如果提供了系統錢包指派，填充完整資訊
  let systemWalletsWithDetails: SystemWalletAssignment[] | undefined;
  if (createTenantDto.systemWallets && createTenantDto.systemWallets.length > 0) {
    const walletIds = createTenantDto.systemWallets.map(sw => sw.walletId);
    const wallets = await this.systemWalletRepository.find({
      id: { $in: walletIds },
      type: SystemWalletType.REVENUE_DISTRIBUTION,
    });

    systemWalletsWithDetails = createTenantDto.systemWallets.map(sw => {
      const wallet = wallets.find(w => w.id === sw.walletId);
      if (!wallet) {
        throw new NotFoundException(`系統錢包 ID ${sw.walletId} 不存在`);
      }
      return {
        walletId: wallet.id,
        address: wallet.address,
        name: wallet.name,
        chain: wallet.chain,
        percentage: sw.percentage,
        syncedAt: new Date(),
      };
    });
  }

  const tenant = this.em.create(Tenant, {
    // ... 其他欄位 ...
    systemWallets: systemWalletsWithDetails,
  });

  // ... 創建租戶資料庫並同步資料 ...
}
```

3. **在 Tenant DB 中創建系統錢包快照表**（可選）：
```typescript
// packages/database/src/entities/system-wallet-snapshot.entity.ts

@Entity({ tableName: 'system_wallet_snapshots' })
export class SystemWalletSnapshot extends BaseEntity {
  @Property()
  walletId!: number; // Platform DB 中的系統錢包 ID

  @Property()
  address!: string;

  @Property()
  name!: string;

  @Property()
  chain!: string;

  @Property()
  percentage!: number; // 該租戶的分潤比例

  @Property()
  syncedAt!: Date; // 同步時間

  // 用於查詢該租戶的所有系統錢包
  // 不需要 tenant_id，因為每個 Tenant DB 只屬於一個租戶
}
```

#### 優點
- ✅ tenant-api 可以獨立運作，不需要跨資料庫查詢
- ✅ 讀取速度快（本地查詢）
- ✅ 不需要網路請求，降低延遲
- ✅ 資料隔離性好（每個租戶有自己的副本）
- ✅ 即使 Platform API 暫時不可用，tenant-api 仍可運作

#### 缺點
- ❌ 需要維護資料一致性（當系統錢包資訊更新時）
- ❌ 需要額外的存儲空間（但很小）

#### 資料一致性處理

當系統錢包資訊更新時，需要同步到所有相關租戶：

```typescript
// apps/platform-api/src/modules/system-wallets/system-wallets.service.ts

async update(id: number, updateDto: UpdateSystemWalletDto): Promise<SystemWalletResponseDto> {
  const wallet = await this.walletRepository.findOne({ id });
  // ... 更新邏輯 ...

  // 如果更新了地址或名稱，需要同步到所有使用該錢包的租戶
  if (updateDto.address || updateDto.name) {
    await this.syncWalletToTenants(id);
  }

  return SystemWalletResponseDto.fromEntity(wallet);
}

private async syncWalletToTenants(walletId: number): Promise<void> {
  // 查找所有使用該錢包的租戶
  const tenants = await this.tenantRepository.find({
    systemWallets: { $contains: [{ walletId }] },
  });

  // 更新每個租戶的系統錢包資訊
  for (const tenant of tenants) {
    if (tenant.systemWallets) {
      const wallet = await this.systemWalletRepository.findOne({ id: walletId });
      if (wallet) {
        tenant.systemWallets = tenant.systemWallets.map(sw => 
          sw.walletId === walletId
            ? { ...sw, address: wallet.address, name: wallet.name, syncedAt: new Date() }
            : sw
        );
      }
    }
  }

  await this.em.flush();

  // 觸發同步到 Tenant DB（通過 API 或事件）
  // 可以通過 HTTP API 調用 tenant-api 的同步端點
  // 或通過消息隊列（如 RabbitMQ、Redis Pub/Sub）通知
}
```

---

### 方案 2：tenant-api 通過 HTTP API 調用 platform-api

**核心思路**：tenant-api 在需要時通過 HTTP 請求從 platform-api 獲取系統錢包資訊。

#### 實作方式

```typescript
// apps/tenant-api/src/services/platform-api.service.ts

@Injectable()
export class PlatformApiService {
  private readonly platformApiUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.platformApiUrl = process.env.PLATFORM_API_URL || 'http://localhost:3000';
  }

  async getSystemWallets(tenantId: number): Promise<SystemWalletAssignment[]> {
    // 從 Platform API 獲取租戶的系統錢包指派
    const response = await this.httpService.get(
      `${this.platformApiUrl}/api/tenants/${tenantId}/system-wallets`
    ).toPromise();

    return response.data;
  }
}
```

#### 優點
- ✅ 資料始終是最新的（單一數據源）
- ✅ 不需要維護資料同步
- ✅ Platform DB 是唯一數據源

#### 缺點
- ❌ 每次讀取都需要網路請求，增加延遲
- ❌ 依賴 Platform API 的可用性
- ❌ 增加網路負載
- ❌ 如果 Platform API 故障，tenant-api 無法運作

---

### 方案 3：tenant-api 直接連接 Platform DB（不推薦）

**核心思路**：tenant-api 同時連接 Platform DB 和 Tenant DB。

#### 缺點
- ❌ 違反資料隔離原則
- ❌ 增加系統複雜度
- ❌ 安全風險（tenant-api 可以訪問所有租戶的資料）
- ❌ 難以擴展（每個 tenant-api 實例都需要連接 Platform DB）

---

### 方案 4：事件驅動同步（進階方案）

**核心思路**：當系統錢包資訊更新時，通過消息隊列通知所有相關的 tenant-api 實例。

#### 實作方式

使用 Redis Pub/Sub 或 RabbitMQ：

```typescript
// apps/platform-api/src/modules/system-wallets/system-wallets.service.ts

async update(id: number, updateDto: UpdateSystemWalletDto): Promise<SystemWalletResponseDto> {
  // ... 更新邏輯 ...

  // 發布事件
  await this.eventEmitter.emit('system-wallet.updated', {
    walletId: id,
    address: wallet.address,
    name: wallet.name,
    // ... 其他資訊
  });
}

// apps/tenant-api/src/listeners/system-wallet.listener.ts

@OnEvent('system-wallet.updated')
async handleSystemWalletUpdated(payload: SystemWalletUpdatedEvent) {
  // 更新本地快取或資料庫
  await this.updateSystemWalletCache(payload);
}
```

---

## 推薦方案：方案 1（資料複製 + 快取）

結合方案 1 和方案 4 的優點：

1. **創建/更新租戶時**：將完整的系統錢包資訊複製到 Tenant DB
2. **系統錢包更新時**：通過事件機制通知所有相關租戶更新
3. **tenant-api 運作時**：直接從本地 Tenant DB 讀取，無需跨資料庫查詢

### 實作步驟

1. 擴展 `SystemWalletAssignment` 介面，包含完整資訊
2. 在創建/更新租戶時填充完整資訊
3. 實作系統錢包更新時的同步機制
4. tenant-api 直接從 Tenant DB 讀取系統錢包資訊

---

## 總結

| 方案 | 讀取速度 | 資料一致性 | 系統複雜度 | 推薦度 |
|------|---------|-----------|-----------|--------|
| 方案 1：資料複製 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 方案 2：HTTP API | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 方案 3：直接連接 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ |
| 方案 4：事件同步 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |

**最終推薦**：方案 1（資料複製），因為：
- tenant-api 需要頻繁讀取系統錢包資訊（每次分潤計算都需要）
- 讀取性能要求高
- 系統錢包資訊更新頻率低
- 資料一致性可以通過同步機制保證
