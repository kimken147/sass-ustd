# MikroORM 完整設置指南

## 🎉 已完成配置

✅ 所有 package.json 已更新為 MikroORM  
✅ 已創建 3 個核心 Entities (Tenant, User, Agent)  
✅ Platform API 和 Tenant API 已配置完成  
✅ 環境變數已更新為 PostgreSQL  

## 📦 安裝的包

```json
{
  "@mikro-orm/core": "^6.3.13",
  "@mikro-orm/nestjs": "^6.0.2",
  "@mikro-orm/postgresql": "^6.3.13",
  "@mikro-orm/migrations": "^6.3.13"
}
```

## 🗄️ 資料庫結構

### Entities

#### 1. Tenant (租戶)
```typescript
@Entity({ tableName: 'tenants' })
export class Tenant extends BaseEntity {
  name: string;        // 租戶名稱
  slug: string;        // URL 友好名稱
  email: string;       // 租戶郵箱
  status: TenantStatus; // active | suspended | inactive
  plan: TenantPlan;    // trial | basic | pro | enterprise
  branding?: TenantBranding;  // 白標配置
  features?: TenantFeatures;  // 功能開關
  limits?: TenantLimits;      // 限制設置
}
```

#### 2. User (用戶)
```typescript
@Entity({ tableName: 'users' })
export class User extends BaseEntity {
  email: string;
  password: string;
  name: string;
  role: UserRole;      // platform_admin | tenant_admin | agent | customer
  tenant?: Tenant;     // 所屬租戶
  agent?: Agent;       // 所屬代理商
  status: UserStatus;  // active | inactive | suspended
}
```

#### 3. Agent (代理商 - 無限層級)
```typescript
@Entity({ tableName: 'agents' })
export class Agent extends BaseEntity {
  tenant: Tenant;
  user: User;
  name: string;
  code: string;              // 代理商代碼
  parentAgent?: Agent;       // 父代理
  path: string;              // "root/1/5/12" - 用於快速查詢
  level: number;             // 0 = 頂級, 1 = 二級...
  commission: AgentCommission; // 佣金設置
  status: AgentStatus;
  stats: AgentStats;         // 統計數據
}
```

## 🚀 快速開始

### 1. 安裝 PostgreSQL

#### Docker (推薦)
```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=saas_platform \
  -p 5432:5432 \
  postgres:16-alpine
```

#### macOS
```bash
brew install postgresql@16
brew services start postgresql@16
```

#### Ubuntu
```bash
sudo apt-get update
sudo apt-get install postgresql-16
sudo systemctl start postgresql
```

### 2. 創建資料庫
```bash
# 連接到 PostgreSQL
psql -U postgres

# 創建資料庫
CREATE DATABASE saas_platform;
CREATE DATABASE tenant_test_001;

# 退出
\q
```

### 3. 安裝依賴
```bash
cd saas-platform-structure
pnpm install
```

### 4. 配置環境變數
```bash
cp .env.example .env
```

編輯 `.env`:
```env
# Platform API
PLATFORM_DB_HOST=localhost
PLATFORM_DB_PORT=5432
PLATFORM_DB_NAME=saas_platform
PLATFORM_DB_USER=postgres
PLATFORM_DB_PASSWORD=postgres

# Tenant API
TENANT_DB_HOST=localhost
TENANT_DB_PORT=5432
TENANT_DB_NAME=tenant
TENANT_DB_USER=postgres
TENANT_DB_PASSWORD=postgres
TENANT_ID=test_001
```

### 5. 生成遷移並運行
```bash
# 在 platform-api 目錄
cd apps/platform-api

# 創建初始遷移
npx mikro-orm migration:create

# 運行遷移
npx mikro-orm migration:up

# 啟動服務
pnpm dev
```

### 6. 訪問 API
- Platform API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs
- Tenant API: http://localhost:3001

## 💻 使用 MikroORM

### 在 Module 中註冊 Entity
```typescript
@Module({
  imports: [
    MikroOrmModule.forFeature([Tenant, User, Agent])
  ],
  providers: [TenantsService],
  controllers: [TenantsController],
})
export class TenantsModule {}
```

### Service 中使用 EntityManager
```typescript
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Tenant } from '@saas-platform/database';

@Injectable()
export class TenantsService {
  constructor(private readonly em: EntityManager) {}

  // 創建租戶
  async create(data: CreateTenantDto) {
    const tenant = this.em.create(Tenant, data);
    await this.em.flush(); // 一次性提交
    return tenant;
  }

  // 查詢所有
  async findAll() {
    return this.em.find(Tenant, {});
  }

  // 根據 ID 查詢
  async findOne(id: number) {
    return this.em.findOneOrFail(Tenant, id);
  }

  // 更新租戶
  async update(id: number, data: UpdateTenantDto) {
    const tenant = await this.em.findOneOrFail(Tenant, id);
    this.em.assign(tenant, data);
    await this.em.flush();
    return tenant;
  }

  // 軟刪除
  async remove(id: number) {
    const tenant = await this.em.findOneOrFail(Tenant, id);
    tenant.deletedAt = new Date();
    await this.em.flush();
    return tenant;
  }
}
```

### Unit of Work 範例
```typescript
async transferMoney(fromId: number, toId: number, amount: number) {
  // fork() 創建獨立的 Unit of Work
  const em = this.em.fork();
  
  const from = await em.findOneOrFail(User, fromId);
  const to = await em.findOneOrFail(User, toId);
  
  from.balance -= amount;  // 只是修改記憶體
  to.balance += amount;    // 只是修改記憶體
  
  // flush() 自動包裝在交易中
  await em.flush(); // 一次性批量操作，失敗自動回滾
}
```

### 無限層級代理查詢
```typescript
// 查詢所有下級代理（包括所有層級）
async findSubAgents(agentId: number) {
  const agent = await this.em.findOneOrFail(Agent, agentId);
  
  return this.em.find(Agent, {
    path: { $like: `${agent.path}/${agentId}%` }
  });
}

// 查詢直接下級代理
async findDirectChildren(agentId: number) {
  return this.em.find(Agent, {
    parentAgent: agentId
  });
}

// 計算佣金（遞迴上級）
async calculateCommission(agentId: number, amount: number) {
  const commissions = [];
  let agent = await this.em.findOneOrFail(Agent, agentId, {
    populate: ['parentAgent']
  });
  
  while (agent) {
    commissions.push({
      agentId: agent.id,
      rate: agent.commission.rate,
      amount: amount * (agent.commission.rate / 100),
    });
    
    await agent.parentAgent?.init(); // 延遲載入
    agent = agent.parentAgent;
  }
  
  return commissions;
}
```

### 複雜查詢
```typescript
// QueryBuilder
const agents = await this.em
  .createQueryBuilder(Agent, 'a')
  .where({ tenant: tenantId, status: AgentStatus.ACTIVE })
  .andWhere({ level: { $lte: 3 } })
  .leftJoinAndSelect('a.user', 'u')
  .orderBy({ level: 'ASC', createdAt: 'DESC' })
  .limit(20)
  .getResultList();

// 聚合查詢
const stats = await this.em
  .createQueryBuilder(Agent, 'a')
  .select([
    'COUNT(a.id) as total',
    'SUM(a.stats.totalRevenue) as revenue',
    'AVG(a.stats.totalCommission) as avgCommission'
  ])
  .where({ tenant: tenantId })
  .execute('get');
```

## 🔧 MikroORM CLI 命令

```bash
# 創建遷移
npx mikro-orm migration:create

# 運行遷移
npx mikro-orm migration:up

# 回滾遷移
npx mikro-orm migration:down

# 查看待執行的遷移
npx mikro-orm migration:pending

# 從資料庫生成 Entity
npx mikro-orm generate-entities --dump

# 清除快取
npx mikro-orm cache:clear

# 檢查 schema 差異
npx mikro-orm schema:update --run
```

## 📚 關鍵特性

### 1. Unit of Work
- 自動追蹤實體變更
- 批量提交減少資料庫操作
- 自動處理交易

### 2. Identity Map
- 同一個請求中相同 ID 的實體只查詢一次
- 自動快取
- 防止資料不一致

### 3. 關聯管理
```typescript
// 自動載入關聯
const user = await this.em.findOne(User, 1, {
  populate: ['tenant', 'agent', 'agent.parentAgent']
});

// 類型安全
console.log(user.tenant.name); // ✅ TypeScript 知道已載入
```

### 4. 延遲載入
```typescript
const user = await this.em.findOne(User, 1);

// 需要時再載入
await user.agent?.init();
console.log(user.agent?.name);
```

## ⚡ 效能優化

### 1. 使用 em.fork() 隔離操作
```typescript
// ❌ 不好 - 所有操作在同一個 EM
async handleRequest() {
  const user = await this.em.findOne(User, 1);
  user.name = 'John';
  // ...其他操作
  await this.em.flush(); // 可能會提交不想提交的變更
}

// ✅ 好 - 使用 fork 隔離
async handleRequest() {
  const em = this.em.fork();
  const user = await em.findOne(User, 1);
  user.name = 'John';
  await em.flush(); // 只提交這個請求的變更
}
```

### 2. 批量操作
```typescript
// ❌ 不好 - N 次資料庫操作
for (const data of userData) {
  const user = this.em.create(User, data);
  await this.em.flush();
}

// ✅ 好 - 1 次批量操作
for (const data of userData) {
  this.em.create(User, data);
}
await this.em.flush(); // 批量插入
```

### 3. 使用 populate 避免 N+1
```typescript
// ❌ N+1 問題
const users = await this.em.find(User, {});
for (const user of users) {
  console.log(user.tenant.name); // 每次都查詢
}

// ✅ 一次載入所有關聯
const users = await this.em.find(User, {}, {
  populate: ['tenant']
});
for (const user of users) {
  console.log(user.tenant.name); // 不會額外查詢
}
```

## 🚨 常見錯誤

### 1. 忘記 flush()
```typescript
// ❌ 變更不會保存
const user = await this.em.findOne(User, 1);
user.name = 'John';
// 沒有 flush，變更不會保存到資料庫

// ✅ 正確做法
await this.em.flush();
```

### 2. Entity 未註冊
```
Error: Entity 'Tenant' not discovered
```
解決：在 `app.module.ts` 的 `entities` 陣列中添加。

### 3. 關聯未載入
```typescript
// ❌ 關聯未載入
const user = await this.em.findOne(User, 1);
console.log(user.tenant.name); // Error: tenant 未載入

// ✅ 使用 populate
const user = await this.em.findOne(User, 1, {
  populate: ['tenant']
});
```

## 📖 推薦閱讀

1. [MikroORM 官方文檔](https://mikro-orm.io/)
2. [NestJS + MikroORM](https://mikro-orm.io/docs/usage-with-nestjs)
3. [Unit of Work 模式](https://martinfowler.com/eaaCatalog/unitOfWork.html)
4. [Migration Guide](https://mikro-orm.io/docs/migrations)

## 🎯 下一步

1. ✅ 創建 Tenants Module
2. ✅ 創建 Agents Module  
3. ✅ 實作認證系統
4. ✅ 編寫測試
5. ✅ 配置 CI/CD

---

**MikroORM 配置完成！開始開發吧！** 🚀
