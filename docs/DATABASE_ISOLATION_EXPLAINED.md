# 資料庫「獨立」概念詳解

## 🎯 核心問題：獨立 DB 是什麼意思？

### 答案：**不一定！** 

「獨立 DB」有兩種完全不同的意思：

---

## 📊 兩種「獨立資料庫」

### 模式 A：獨立資料庫 Server（真正的物理隔離）

```
┌─────────────────────────────┐
│  RDS Instance A (獨立伺服器) │
│  - 獨立的 EC2 實例           │
│  - 獨立的 CPU/RAM           │
│  - 獨立的磁碟               │
│  └─ Database: tenant_a      │
└─────────────────────────────┘

┌─────────────────────────────┐
│  RDS Instance B (獨立伺服器) │
│  - 獨立的 EC2 實例           │
│  - 獨立的 CPU/RAM           │
│  - 獨立的磁碟               │
│  └─ Database: tenant_b      │
└─────────────────────────────┘

┌─────────────────────────────┐
│  RDS Instance C (獨立伺服器) │
│  - 獨立的 EC2 實例           │
│  - 獨立的 CPU/RAM           │
│  - 獨立的磁碟               │
│  └─ Database: tenant_c      │
└─────────────────────────────┘
```

**AWS 實作**：
```bash
# 為每個租戶創建獨立的 RDS 實例
aws rds create-db-instance \
  --db-instance-identifier tenant-a-db \
  --db-instance-class db.t3.micro \
  --engine postgres

aws rds create-db-instance \
  --db-instance-identifier tenant-b-db \
  --db-instance-class db.t3.micro \
  --engine postgres
```

**成本**（100 個租戶）：
```
每個租戶一個 RDS 實例:
  db.t3.micro: $15/月 × 100 = $1,500/月 💰💰💰
```

---

### 模式 B：共用 Server，多個 Database（邏輯隔離）⭐ **推薦**

```
┌─────────────────────────────────────────────┐
│  單一 RDS Instance (共用伺服器)              │
│  - 1 個 EC2 實例                            │
│  - 共用 CPU/RAM                             │
│  - 共用磁碟                                 │
│                                             │
│  ├─ Database: tenant_a (獨立資料庫)          │
│  ├─ Database: tenant_b (獨立資料庫)          │
│  ├─ Database: tenant_c (獨立資料庫)          │
│  ├─ Database: tenant_d (獨立資料庫)          │
│  └─ ... (可以有很多個)                       │
└─────────────────────────────────────────────┘
```

**AWS 實作**：
```bash
# 只創建一個 RDS 實例
aws rds create-db-instance \
  --db-instance-identifier shared-tenants-db \
  --db-instance-class db.r5.large \
  --engine postgres

# 在同一個 RDS 實例內創建多個 Database
psql -h shared-tenants-db.xxx.rds.amazonaws.com -U postgres

CREATE DATABASE tenant_a;
CREATE DATABASE tenant_b;
CREATE DATABASE tenant_c;
-- 可以創建很多個 database
```

**成本**（100 個租戶）：
```
1 個大的 RDS 實例:
  db.r5.large: $212/月
  儲存 200GB: $23/月
  ────────────────────
  總計: $235/月 💰 (便宜 6 倍！)
```

---

## 🔍 詳細對比

### PostgreSQL 層級結構

```
┌─────────────────────────────────────────────┐
│           RDS Instance (實例/伺服器)         │  ← 物理隔離在這層
│           - CPU、RAM、磁碟                   │
│                                             │
│  ├─ PostgreSQL Cluster (叢集)              │
│  │                                          │
│  │  ├─ Database: tenant_a                  │  ← 邏輯隔離在這層
│  │  │  ├─ Schema: public                   │
│  │  │  │  ├─ Table: users                  │
│  │  │  │  └─ Table: orders                 │
│  │  │  └─ Schema: custom                   │
│  │  │                                       │
│  │  ├─ Database: tenant_b                  │  ← 邏輯隔離
│  │  │  ├─ Schema: public                   │
│  │  │  │  ├─ Table: users                  │
│  │  │  │  └─ Table: orders                 │
│  │  │                                       │
│  │  └─ Database: tenant_c                  │  ← 邏輯隔離
│  │     └─ Schema: public                   │
│  │        ├─ Table: users                  │
│  │        └─ Table: orders                 │
└─────────────────────────────────────────────┘
```

---

## 💰 成本對比（100 個租戶）

### 方案 A：每租戶獨立 RDS Instance

```yaml
配置:
  - 100 個 RDS Instance
  - 每個: db.t3.micro (1 vCPU, 1GB RAM)
  - 每個: 20GB 儲存

成本:
  RDS 實例: $15/月 × 100 = $1,500/月
  儲存: $2.3/月 × 100 = $230/月
  ────────────────────────────────
  總計: $1,730/月

每租戶成本: $17.30/月
```

### 方案 B：共用 RDS Instance，多個 Database ⭐

```yaml
配置:
  - 1 個 RDS Instance
  - db.r5.large (2 vCPU, 16GB RAM)
  - 200GB 儲存
  - 100 個 Database

成本:
  RDS 實例: $212/月
  儲存: $23/月
  ────────────────────────────────
  總計: $235/月

每租戶成本: $2.35/月

節省: 87% 💰💰💰
```

---

## ⚡ 效能對比

### 隔離度

| 項目 | 獨立 RDS Instance | 共用 Instance, 多 DB |
|------|------------------|---------------------|
| **CPU 隔離** | ✅ 完全隔離 | ⚠️ 共用（有競爭） |
| **記憶體隔離** | ✅ 完全隔離 | ⚠️ 共用（有競爭） |
| **磁碟 I/O 隔離** | ✅ 完全隔離 | ⚠️ 共用（有競爭） |
| **網路隔離** | ✅ 完全隔離 | ⚠️ 共用（有競爭） |
| **資料隔離** | ✅ 完全隔離 | ✅ 完全隔離 |
| **備份隔離** | ✅ 可獨立備份 | ⚠️ 整個實例一起備份 |
| **故障隔離** | ✅ 其他租戶不受影響 | ❌ 整個實例掛掉全掛 |

### Noisy Neighbor 問題

**方案 A（獨立 Instance）**：
```
租戶 A 的大量查詢 → 只影響租戶 A ✅
租戶 B、C 完全不受影響
```

**方案 B（共用 Instance）**：
```
租戶 A 的大量查詢 → 消耗大量 CPU/RAM
租戶 B、C 的查詢變慢 ❌
```

---

## 🎯 實際使用場景

### 方案 A：獨立 RDS Instance

**適合**：
```yaml
1. 企業客戶 (> $1,000/月)
   - 需要 SLA 保證
   - 不能接受效能波動

2. 合規要求
   - 金融、醫療行業
   - 需要物理隔離證明

3. 超大租戶
   - 資料量 > 100GB
   - QPS > 1000

4. 地理隔離
   - 資料主權要求
   - 不同區域的租戶

5. 極度客製化
   - 需要特殊 PostgreSQL 擴展
   - 需要自訂配置
```

**不適合**：
```yaml
❌ 大量小租戶 (100+)
❌ 預算有限
❌ 初創公司
❌ 資料量小 (< 1GB)
```

---

### 方案 B：共用 Instance，多 DB ⭐ **推薦**

**適合**：
```yaml
1. 大部分 SaaS 場景 ✅
   - 成本敏感
   - 租戶數量多

2. 中小型租戶
   - 資料量 < 10GB/租戶
   - QPS < 100/租戶

3. 標準化服務
   - 所有租戶相同配置
   - 不需要特殊客製化

4. 快速擴展
   - 需要頻繁增加租戶
   - 不想管理大量實例
```

**限制**：
```yaml
⚠️ 單一實例上限
   - PostgreSQL 建議 < 200 個 Database
   - 超過需要多個實例

⚠️ Noisy Neighbor
   - 需要監控租戶使用量
   - 可能需要限流

⚠️ 備份粒度
   - 只能整個實例備份
   - 無法單獨恢復一個租戶
```

---

## 🏗️ 實作範例

### 方案 A：獨立 RDS Instance

**Terraform**：
```hcl
# 為每個租戶創建獨立 RDS
resource "aws_db_instance" "tenant" {
  for_each = var.tenants

  identifier           = "tenant-${each.key}"
  engine              = "postgres"
  instance_class      = "db.t3.micro"
  allocated_storage   = 20
  
  db_name             = "tenant_${each.key}"
  username            = "postgres"
  password            = random_password.tenant[each.key].result
  
  # 每個租戶可以有不同的備份策略
  backup_retention_period = each.value.backup_days
  
  tags = {
    Tenant = each.key
    Plan   = each.value.plan
  }
}
```

**連接**：
```typescript
// 每個租戶連到自己的 RDS 實例
const tenantDbConfig = {
  host: `tenant-${tenantId}.xxx.rds.amazonaws.com`,
  port: 5432,
  database: `tenant_${tenantId}`,
  username: 'postgres',
  password: getTenantPassword(tenantId),
};
```

---

### 方案 B：共用 Instance，多 DB ⭐

**Terraform**：
```hcl
# 只創建一個大的 RDS 實例
resource "aws_db_instance" "shared" {
  identifier           = "shared-tenants-db"
  engine              = "postgres"
  instance_class      = "db.r5.large"  # 大一點的實例
  allocated_storage   = 200
  
  db_name             = "postgres"
  username            = "postgres"
  password            = var.master_password
  
  # 統一的備份策略
  backup_retention_period = 7
  
  tags = {
    Purpose = "Multi-Tenant"
  }
}

# Database 在應用層創建
resource "postgresql_database" "tenant" {
  for_each = var.tenants
  
  name = "tenant_${each.key}"
}
```

**連接**：
```typescript
// 所有租戶連到同一個 RDS 實例，但不同 Database
const tenantDbConfig = {
  host: 'shared-tenants-db.xxx.rds.amazonaws.com', // 同一個 host
  port: 5432,
  database: `tenant_${tenantId}`, // 不同 database
  username: 'postgres',
  password: getMasterPassword(),
};
```

**MikroORM 配置**：
```typescript
// apps/tenant-api/src/app.module.ts
MikroOrmModule.forRootAsync({
  useFactory: (configService: ConfigService) => {
    const tenantId = configService.get('TENANT_ID');
    
    return {
      driver: PostgreSqlDriver,
      
      // 重點：同一個 host，不同 database
      host: 'shared-tenants-db.xxx.rds.amazonaws.com',
      port: 5432,
      database: `tenant_${tenantId}`, // ← 這裡不同
      
      user: 'postgres',
      password: getMasterPassword(),
      
      entities: [User, Agent, Product],
    };
  },
})
```

---

## 📈 擴展策略

### 方案 B 的擴展路徑

#### 階段 1：單一實例（0-50 租戶）
```
┌─────────────────────────────┐
│  RDS Instance (db.r5.large) │
│  ├─ tenant_001              │
│  ├─ tenant_002              │
│  ├─ ...                     │
│  └─ tenant_050              │
└─────────────────────────────┘

成本: $235/月
```

#### 階段 2：多個實例（50-200 租戶）
```
┌─────────────────────────────┐
│  RDS Instance A             │
│  ├─ tenant_001 ~ tenant_050 │
└─────────────────────────────┘

┌─────────────────────────────┐
│  RDS Instance B             │
│  ├─ tenant_051 ~ tenant_100 │
└─────────────────────────────┘

┌─────────────────────────────┐
│  RDS Instance C             │
│  ├─ tenant_101 ~ tenant_150 │
└─────────────────────────────┘

成本: $705/月 (仍比獨立便宜)
```

#### 階段 3：混合模式（200+ 租戶）
```
小租戶:
  ├─ Shared Instance A (50 租戶)
  ├─ Shared Instance B (50 租戶)
  └─ Shared Instance C (50 租戶)

大租戶:
  ├─ Dedicated Instance (租戶 VIP1)
  ├─ Dedicated Instance (租戶 VIP2)
  └─ Dedicated Instance (租戶 VIP3)
```

---

## 🎯 我的最終建議

### 針對你的專案（多租戶 SaaS + 無限代理）

### ⭐ 推薦：**方案 B（共用 Instance，多 DB）**

**原因**：

1. **成本效益** 💰
   ```
   省 87% 成本
   $235/月 vs $1,730/月
   ```

2. **資料已經隔離** ✅
   ```
   每個租戶獨立 Database
   無法看到其他租戶資料
   ```

3. **管理簡單** 🎯
   ```
   只需管理 1-3 個 RDS 實例
   而非 100+ 個
   ```

4. **擴展容易** 📈
   ```
   需要時:
   - 垂直擴展：升級實例大小
   - 水平擴展：增加更多實例
   - 混合：大客戶單獨實例
   ```

5. **適合 90% 場景** ✅
   ```
   除非你有:
   - 超大型企業客戶
   - 嚴格合規要求
   - 極端效能需求
   ```

---

## 🔄 升級路徑

### 從方案 B 升級到方案 A

**當某個租戶需要獨立實例時**：

```typescript
// 1. 創建新的獨立 RDS 實例
const newInstance = await createRDSInstance({
  identifier: `tenant-${tenantId}-dedicated`,
  instanceClass: 'db.r5.xlarge',
});

// 2. 使用 AWS DMS 遷移資料
await migrateDatabase({
  source: {
    host: 'shared-tenants-db.xxx.rds.amazonaws.com',
    database: `tenant_${tenantId}`,
  },
  target: {
    host: newInstance.endpoint,
    database: `tenant_${tenantId}`,
  },
});

// 3. 更新租戶配置
await updateTenantConfig(tenantId, {
  deploymentMode: 'dedicated',
  dbHost: newInstance.endpoint,
});

// 4. 切換連接（零停機）
// 使用 DNS 或配置更新
```

**遷移時間**：1-4 小時（取決於資料量）

---

## ✅ 總結

### 「獨立 DB」的兩種意思：

| 意思 | 英文 | 成本 | 推薦度 |
|------|------|------|--------|
| **獨立 Database** | Separate Database | 💰 低 | ⭐⭐⭐⭐⭐ |
| **獨立 RDS Instance** | Separate Instance | 💰💰💰 高 | ⭐⭐ |

### 我的建議：

1. **現在**：使用共用 Instance + 多 Database
   - 成本低、管理簡單
   - 資料已經隔離

2. **未來**：按需升級到獨立 Instance
   - 只給真正需要的客戶
   - 可以收取溢價

---

**現在清楚了嗎？「獨立 DB」指的是獨立 Database，不是獨立 Server！** 😊

**你的架構應該是：共用 RDS Instance，每個租戶一個獨立 Database！** ✅
