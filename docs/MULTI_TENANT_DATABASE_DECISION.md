# 多租戶資料庫架構決策指南

## 🎯 你的問題

**應該使用：**
1. **方案 A**: Platform DB 一個 + 每個租戶各一個 DB（你目前的設計）
2. **方案 B**: 全部用一個 DB，用 tenant_id 區分

## 📊 三種多租戶資料庫模式

### 模式 1️⃣：共享資料庫 + 共享 Schema (Shared Database, Shared Schema)

```
┌─────────────────────────────────┐
│      單一資料庫 (saas_db)        │
├─────────────────────────────────┤
│  tenants                        │
│  ├─ id: 1, name: "租戶A"        │
│  └─ id: 2, name: "租戶B"        │
│                                 │
│  users                          │
│  ├─ id: 1, tenant_id: 1, name: "John"  │
│  ├─ id: 2, tenant_id: 1, name: "Mary"  │
│  ├─ id: 3, tenant_id: 2, name: "Bob"   │
│  └─ id: 4, tenant_id: 2, name: "Alice" │
│                                 │
│  agents                         │
│  ├─ id: 1, tenant_id: 1, ...   │
│  └─ id: 2, tenant_id: 2, ...   │
└─────────────────────────────────┘
```

**實作方式**：
```sql
-- 每個表都加 tenant_id
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  INDEX(tenant_id)
);

-- 查詢時必須帶 tenant_id
SELECT * FROM users WHERE tenant_id = 123;
```

**✅ 優點**：
- 💰 成本最低（單一資料庫）
- 🚀 部署最簡單
- 🔧 Schema 遷移最容易（一次搞定）
- 📊 跨租戶分析容易
- 🎯 適合大量小租戶（1000+ 租戶）

**❌ 缺點**：
- 🔒 資料隔離度最低
- ⚠️ 程式碼 bug 可能洩漏資料
- 😱 "Noisy Neighbor" 問題（一個租戶影響全部）
- 📈 擴展性受限（單一資料庫上限）
- 🚫 無法提供租戶獨立備份/恢復
- 🛑 無法客製化租戶 Schema

---

### 模式 2️⃣：共享資料庫 + 獨立 Schema (Shared Database, Separate Schemas)

```
┌─────────────────────────────────┐
│      單一資料庫 (saas_db)        │
├─────────────────────────────────┤
│  Schema: public                 │
│  └─ tenants (全域表)            │
│                                 │
│  Schema: tenant_001             │
│  ├─ users                       │
│  ├─ agents                      │
│  └─ products                    │
│                                 │
│  Schema: tenant_002             │
│  ├─ users                       │
│  ├─ agents                      │
│  └─ products                    │
└─────────────────────────────────┘
```

**實作方式**：
```sql
-- 為每個租戶創建 Schema
CREATE SCHEMA tenant_001;
CREATE SCHEMA tenant_002;

-- 在各自 Schema 中創建表
CREATE TABLE tenant_001.users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  name VARCHAR(255)
);

CREATE TABLE tenant_002.users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  name VARCHAR(255)
);

-- 查詢時使用 Schema
SELECT * FROM tenant_001.users;
```

**✅ 優點**：
- 🔒 中等資料隔離度
- 💰 成本較低（單一資料庫伺服器）
- 🎨 可以客製化租戶 Schema
- 📊 比單 Schema 稍好的效能隔離

**❌ 缺點**：
- 🤯 Schema 遷移地獄（需要遷移 N 個 Schema）
- 🐛 複雜度高，容易出錯
- 📈 擴展性仍受限（單一資料庫）
- 😱 仍有 "Noisy Neighbor" 問題
- 🚫 PostgreSQL 的 Schema 數量有上限

**⚠️ 業界共識：不推薦這種模式**
> "Avoid Shared Database, Separate Schemas, as it combines the drawbacks of both models without delivering significant benefits."

---

### 模式 3️⃣：獨立資料庫 (Database per Tenant) ⭐ 你目前的設計

```
┌─────────────────────────────────┐
│  Platform DB (saas_platform)    │
├─────────────────────────────────┤
│  tenants (全域租戶列表)         │
│  ├─ id: 1, slug: "abc"          │
│  └─ id: 2, slug: "xyz"          │
│                                 │
│  platform_users (平台管理員)     │
│  billing (計費記錄)              │
│  analytics (跨租戶分析)          │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Tenant DB (tenant_abc)         │
├─────────────────────────────────┤
│  users                          │
│  agents                         │
│  customers                      │
│  products                       │
│  orders                         │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Tenant DB (tenant_xyz)         │
├─────────────────────────────────┤
│  users                          │
│  agents                         │
│  customers                      │
│  products                       │
│  orders                         │
└─────────────────────────────────┘
```

**實作方式**：
```typescript
// 動態連接到租戶資料庫
const tenantId = request.tenant.slug;
const dbName = `tenant_${tenantId}`;

// MikroORM 動態配置
const orm = await MikroORM.init({
  dbName: dbName,
  // ... 其他配置
});
```

**✅ 優點**：
- 🔒 最高資料隔離度（物理隔離）
- 🛡️ 最安全（資料洩漏風險最低）
- 📊 每個租戶獨立效能（無 Noisy Neighbor）
- 💾 可獨立備份/恢復租戶資料
- 🎨 可完全客製化租戶 Schema
- 📈 水平擴展容易（不同租戶可在不同伺服器）
- 🚚 租戶遷移容易（直接搬資料庫）
- 💰 大租戶可用高規格，小租戶用低規格
- 🔐 符合合規要求（GDPR、HIPAA 等）

**❌ 缺點**：
- 💰 成本較高（多個資料庫實例）
- 🔧 Schema 遷移複雜（需遷移 N 個資料庫）
- 🛠️ 維護複雜度較高
- 📊 跨租戶分析較困難（需要聯合查詢）
- ⚠️ 不適合超大量小租戶（10,000+ 個）

---

## 🎯 針對你的專案分析

### 你的專案特性：

| 特性 | 重要性 | 適合模式 |
|------|--------|---------|
| 無限層級代理系統 | ⭐⭐⭐⭐⭐ | 獨立 DB |
| 複雜佣金計算 | ⭐⭐⭐⭐⭐ | 獨立 DB |
| 白標支持 | ⭐⭐⭐⭐⭐ | 獨立 DB |
| 每個租戶獨立部署 | ⭐⭐⭐⭐⭐ | 獨立 DB |
| 多種計費模式 | ⭐⭐⭐⭐ | 獨立 DB |
| 資料安全合規 | ⭐⭐⭐⭐⭐ | 獨立 DB |
| 租戶客製化需求 | ⭐⭐⭐⭐ | 獨立 DB |

### 預期租戶數量評估：

```
第一年：10-50 個租戶
第二年：50-200 個租戶
第三年：200-1000 個租戶
```

**結論：1000 個租戶以下，獨立資料庫完全可行** ✅

---

## 💰 成本對比

### 假設場景：100 個租戶

#### 方案 A：獨立資料庫

```yaml
Platform DB (Aurora PostgreSQL):
  - db.r5.large: $212/月
  - 儲存 100GB: $10/月
  - 總計: ~$230/月

每個租戶 DB (RDS PostgreSQL):
  - db.t3.micro: $15/月 × 100 = $1,500/月
  或
  - Aurora Serverless v2 (按需): $30-80/月/租戶
    平均 $50/月 × 100 = $5,000/月

總成本: $1,730 - $5,230/月
```

#### 方案 B：共享資料庫

```yaml
單一資料庫 (Aurora PostgreSQL):
  - db.r5.2xlarge: $424/月
  - 儲存 500GB: $50/月
  - I/O 費用: $100-300/月
  
總成本: $574 - $774/月
```

**成本差異：方案 A 貴 3-7 倍** 💰

### 🤔 但是！成本不是唯一考量

**方案 A 的隱藏價值**：
- 💼 可以向企業客戶收取溢價（獨立資料庫 = 賣點）
- 🔒 降低資料洩漏風險 = 避免法律糾紛成本
- 📈 更容易向上銷售（Premium 客戶獨立伺服器）
- 🚀 可以按租戶規模定價

---

## 🏆 最終建議

### ⭐ 推薦：**混合模式** (Hybrid Approach)

這是業界最佳實踐，兼顧成本和靈活性：

```
┌─────────────────────────────────────────────┐
│           Platform DB                        │
│  - 租戶元資料                                │
│  - 平台管理                                  │
│  - 計費系統                                  │
│  - 跨租戶分析                                │
└─────────────────────────────────────────────┘
            │
            ├─────────────────────────────────┐
            │                                 │
┌───────────▼──────────┐          ┌──────────▼──────────┐
│  共享資料庫           │          │  獨立資料庫          │
│  (小型/試用租戶)      │          │  (付費/企業租戶)     │
├──────────────────────┤          ├─────────────────────┤
│  tenant_id: 1        │          │  tenant_abc (專屬)   │
│  tenant_id: 2        │          │  tenant_xyz (專屬)   │
│  tenant_id: 3        │          │  tenant_enterprise   │
│  ...                 │          └─────────────────────┘
└──────────────────────┘
```

### 實作策略：

#### 階段 1：MVP（前 3-6 個月）
```yaml
策略: 全部用共享資料庫
原因:
  - 快速開發
  - 成本最低
  - 驗證商業模式
  
架構:
  - 1 個 Platform DB
  - 1 個 Shared Tenant DB (所有租戶)
  
成本: ~$100-200/月
```

#### 階段 2：Growth（6-18 個月）
```yaml
策略: 混合模式
原因:
  - 有了付費客戶
  - 需要差異化服務
  
架構:
  - 1 個 Platform DB
  - 1 個 Shared Tenant DB (免費/小型租戶)
  - N 個獨立 DB (付費/企業租戶)
  
計費策略:
  - 免費版/基礎版: 共享資料庫
  - Pro 版: 獨立資料庫 (加價 $50/月)
  - Enterprise 版: 獨立伺服器 (加價 $500/月)
```

#### 階段 3：Scale（18+ 個月）
```yaml
策略: 全部獨立資料庫
原因:
  - 有足夠營收支持成本
  - 需要更好的穩定性
  - 企業客戶要求合規
  
架構:
  - 1 個 Platform DB
  - N 個獨立 Tenant DB
  - Aurora Serverless v2 (按需擴展)
  
遷移策略:
  - 使用 AWS DMS 從共享 DB 遷移到獨立 DB
  - 分批遷移，不影響服務
```

---

## 🛠️ 實作建議

### 你的架構應該這樣設計：

```typescript
// packages/database/src/config/tenant-db.config.ts

export enum TenantDatabaseMode {
  SHARED = 'shared',      // 共享資料庫
  DEDICATED = 'dedicated', // 獨立資料庫
}

export interface TenantDatabaseConfig {
  tenantId: string;
  mode: TenantDatabaseMode;
  dbName: string;
  host?: string;
  port?: number;
}

// 從 Platform DB 獲取租戶配置
export async function getTenantDbConfig(
  tenantId: string
): Promise<TenantDatabaseConfig> {
  const tenant = await platformOrm.em.findOne(Tenant, { 
    slug: tenantId 
  });
  
  if (!tenant) {
    throw new Error('Tenant not found');
  }
  
  // 根據租戶計劃決定模式
  const mode = tenant.plan === TenantPlan.ENTERPRISE 
    ? TenantDatabaseMode.DEDICATED 
    : TenantDatabaseMode.SHARED;
  
  const dbName = mode === TenantDatabaseMode.DEDICATED
    ? `tenant_${tenantId}`
    : 'tenants_shared';
  
  return {
    tenantId,
    mode,
    dbName,
    host: tenant.customDbHost, // 企業客戶可能有獨立伺服器
    port: tenant.customDbPort,
  };
}
```

### Tenant API 動態連接：

```typescript
// apps/tenant-api/src/app.module.ts

@Module({
  imports: [
    MikroOrmModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        const tenantId = configService.get('TENANT_ID');
        const dbConfig = await getTenantDbConfig(tenantId);
        
        return {
          driver: PostgreSqlDriver,
          dbName: dbConfig.dbName,
          host: dbConfig.host || 'localhost',
          port: dbConfig.port || 5432,
          // ...
          
          // 如果是共享資料庫，所有查詢自動加 tenant_id filter
          filters: dbConfig.mode === TenantDatabaseMode.SHARED ? {
            tenant: {
              cond: { tenant: tenantId },
              default: true,
            },
          } : {},
        };
      },
    }),
  ],
})
export class AppModule {}
```

---

## 📋 決策檢查表

### 選擇共享資料庫（方案 B）如果：

- [ ] 預算非常有限（< $500/月）
- [ ] 預期租戶數量極大（10,000+）
- [ ] 每個租戶資料量很小（< 100MB）
- [ ] 不需要符合嚴格合規要求
- [ ] 租戶不會要求資料隔離
- [ ] 只是 MVP 階段

### 選擇獨立資料庫（方案 A）如果：

- [x] 有企業客戶或高價值客戶
- [x] 需要符合合規要求（GDPR、HIPAA）
- [x] 資料安全是核心賣點
- [x] 可以向客戶收取溢價
- [x] 需要提供租戶獨立備份/恢復
- [x] 計劃提供白標服務
- [x] 每個租戶資料量大（> 1GB）
- [x] 需要租戶客製化 Schema

**你的專案：7/8 符合獨立資料庫 ✅**

---

## 🎯 我的最終建議

### 針對你的專案（多租戶 SaaS + 無限代理 + 白標）

### 📈 分階段策略：

#### 🚀 立即（前 6 個月）
```
使用: 獨立資料庫模式
原因: 
  1. 白標系統 = 企業客戶 = 願意付費
  2. 代理系統 = 高價值資料 = 需要隔離
  3. 為未來擴展打好基礎
  
架構:
  - Platform DB: Aurora PostgreSQL (db.t3.medium)
  - 每個租戶: RDS PostgreSQL (db.t3.small)
  
初期成本: ~$50-80/月/租戶
```

#### 💰 優化後（6+ 個月）
```
使用: 混合模式
  
小型租戶 (< 10 users):
  - 共享 DB
  - $29/月

中型租戶 (10-50 users):
  - 獨立 DB (RDS)
  - $99/月

企業租戶 (50+ users):
  - 獨立 DB (Aurora)
  - $499/月
```

---

## ✅ 具體行動計劃

### 你現在應該這樣做：

1. **保持目前的獨立資料庫設計** ✅
   - 你的架構已經設計為獨立資料庫
   - 非常正確的選擇！

2. **實作租戶資料庫管理**
   ```typescript
   // 創建新租戶時自動創建資料庫
   async createTenant(data: CreateTenantDto) {
     const tenant = await this.platformEm.create(Tenant, data);
     await this.platformEm.flush();
     
     // 創建租戶資料庫
     await this.createTenantDatabase(tenant.slug);
     
     return tenant;
   }
   ```

3. **未來可選：新增共享模式支持**
   - 為免費試用租戶使用共享資料庫
   - 升級時遷移到獨立資料庫

4. **監控成本**
   - 使用 AWS Cost Explorer
   - 設定預算警報
   - 優化小租戶使用 db.t3.micro

---

## 🎉 結論

**你的架構選擇是正確的！** 🏆

**Platform DB + 每個租戶獨立 DB** 是你專案的最佳方案：

1. ✅ 符合企業客戶需求
2. ✅ 支援白標系統
3. ✅ 資料隔離度最高
4. ✅ 可以差異化定價
5. ✅ 未來擴展性好

**保持這個設計，繼續前進！** 🚀

---

需要我幫你：
1. 🔧 實作租戶資料庫自動創建？
2. 📊 設計租戶遷移策略？
3. 💰 優化成本結構？
4. 🛡️ 實作資料隔離中介軟體？
