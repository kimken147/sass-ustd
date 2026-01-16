# 全局比率分润模型设计

## 概述

将现有的「相对比率」分润模型改为「全局比率」模型，每个代理设定的比率都是相对于总投资金额的百分比。

## 核心概念

### 全局比率 vs 相对比率

| 项目 | 相对比率（旧） | 全局比率（新） |
|------|---------------|---------------|
| 比率基准 | 收到的金额 | 总投资金额 |
| 代理B设定 | selfRate: 20% | allocatedRate: 70% |
| 代理B收益 | 70 × 20% = 14 | 被分配70% - 给下级56% = 14% |

### 分润树状图

```
                    会员投资
                    100 USDT
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
   系统费          站长实收         传下级
   100×10%        100-10-70        100×70%
   = 10 USDT      = 20 USDT        = 70 USDT
       │               │               │
       ▼               ▼               ▼
     平台          站长钱包          代理B
                                收到: 70 USDT
                                       │
                           ┌───────────┴───────────┐
                           ▼                       ▼
                      代理B收益                  传下级
                      70-56=14%                   56%
                      = 14 USDT                = 56 USDT
                           │                       │
                           ▼                       ▼
                      代理B钱包                  代理A
                                            收到: 56 USDT
                                                   │
                                                   ▼
                                              代理A钱包
```

## 数据库变更

### 1. 新增 `agent_commission_settings` 表

```sql
CREATE TABLE agent_commission_settings (
  id              SERIAL PRIMARY KEY,
  parent_agent_id INT NULL,              -- 上级代理 ID，NULL = 站长
  child_agent_id  INT NOT NULL,          -- 下级代理 ID
  allocated_rate  DECIMAL(5,2) NOT NULL, -- 分配的全局比率 (0-100)
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (parent_agent_id) REFERENCES agents(id),
  FOREIGN KEY (child_agent_id) REFERENCES agents(id),
  UNIQUE (parent_agent_id, child_agent_id)
);
```

**说明：**
- `parent_agent_id = NULL` 代表站长分配给直属代理
- 每条代理线独立，代理B 给 A1 和 A2 可以分配不同比率
- `allocated_rate` 是全局比率（相对于总投资金额）

### 2. 修改 `agent` 表

移除 `commission` JSON 中的：
- `selfRate` - 不再需要
- `uplineRate` - 不再需要
- `baseRate` - 不再需要

保留：
- `isEnabled` - 控制是否启用分润

### 3. 修改 `tenant_config` 表

移除 `cryptoConfig` 中的：
- `tenantRevenueRate` - 站长收益自动计算
- `agentCommissionRate` - 不再需要

保留：
- `systemFeeRate` - 系统费率

## 分润计算逻辑

### 计算流程

```typescript
async processInvestment(customer, investmentAmount) {
  // 1. 计算系统费
  const systemFeeRate = config.systemFeeRate; // 如 10%
  const systemFee = investmentAmount * (systemFeeRate / 100);

  // 2. 查询代理链的分配比率
  const agentChain = await getAgentChainWithRates(customer.referralAgent);
  // 返回: [
  //   { agent: A1, allocatedRate: 56 },
  //   { agent: B,  allocatedRate: 70 },
  // ]

  // 3. 计算每人收益
  const distributions = [];
  let previousRate = 0;

  for (const item of agentChain) {
    const selfRate = item.allocatedRate - previousRate;
    const amount = investmentAmount * (selfRate / 100);
    distributions.push({ agent: item.agent, amount });
    previousRate = item.allocatedRate;
  }

  // 4. 计算站长收益（剩余全拿）
  const tenantRate = 100 - systemFeeRate - agentChain[agentChain.length - 1].allocatedRate;
  const tenantRevenue = investmentAmount * (tenantRate / 100);

  // 5. 执行转账
  await transferToSystemWallet(systemFee);
  for (const dist of distributions) {
    await transferToAgentWallet(dist.agent, dist.amount);
  }
  await transferToTenantWallet(tenantRevenue);
}
```

### 示例计算

**代理链：** 站长 → 代理B(70%) → 代理A1(56%)

| 角色 | 计算方式 | 金额 |
|------|---------|------|
| 系统费 | 100 × 10% | 10 USDT |
| 代理A1 | 100 × 56% | 56 USDT |
| 代理B | 100 × (70% - 56%) | 14 USDT |
| 站长 | 100 × (100% - 10% - 70%) | 20 USDT |
| **总计** | | **100 USDT** |

## API 变更

### 创建代理

```typescript
// 站长创建代理B
POST /agents
{
  name: "代理B",
  username: "agentB",
  password: "xxx",
  walletAddress: "TXxx...",
  allocatedRate: 70  // 新字段：分配 70% 给代理B
}

// 代理B 创建代理A1
POST /agents/me/subordinates
{
  name: "代理A1",
  username: "agentA1",
  password: "xxx",
  walletAddress: "TYyy...",
  allocatedRate: 56  // 分配 56% 给 A1（不能超过 70%）
}
```

### 验证规则

1. 站长创建代理：`allocatedRate` ≤ 100 - systemFeeRate
2. 代理创建下级：`allocatedRate` ≤ 上级的 allocatedRate
3. `allocatedRate` 必须 > 0

## 文件修改清单

### 数据库层 (packages/database)

| 文件 | 操作 | 说明 |
|------|------|------|
| `entities/agent-commission-setting.entity.ts` | 新增 | 新实体 |
| `entities/agent.entity.ts` | 修改 | 移除 selfRate/uplineRate |
| `entities/tenant-config.entity.ts` | 修改 | 移除 tenantRevenueRate/agentCommissionRate |
| `entities/index.ts` | 修改 | 导出新实体 |

### 后端 API (apps/tenant-api)

| 文件 | 操作 | 说明 |
|------|------|------|
| `modules/agents/agents.service.ts` | 修改 | 创建代理逻辑、查询代理链 |
| `modules/agents/agents.controller.ts` | 修改 | DTO 变更 |
| `modules/agents/dto/create-agent.dto.ts` | 修改 | allocatedRate 替代 uplineRate |
| `modules/contracts/contracts.service.ts` | 修改 | 分润计算逻辑 |

### 后端 API (apps/platform-api)

| 文件 | 操作 | 说明 |
|------|------|------|
| 检查相关逻辑 | 检查 | 确认是否有需要修改的地方 |

### 前端应用（简体中文转换）

| 应用 | 说明 |
|------|------|
| `apps/customer-web` | 客户端页面 |
| `apps/tenant-admin` | 租户后台 |
| `apps/platform-admin` | 平台后台 |

## 迁移计划

1. 创建新的 `agent_commission_settings` 表
2. 迁移现有代理数据：根据 parentAgent 关系创建记录
3. 计算 allocatedRate：基于现有的 selfRate/uplineRate 反推
4. 验证迁移数据正确性
5. 部署新代码
6. 清理旧字段（可选，保留向后兼容）

## 风险与注意事项

1. **现有数据迁移**：需要正确转换现有代理的比率设定
2. **向后兼容**：考虑是否保留旧字段一段时间
3. **测试覆盖**：确保分润计算的所有场景都有测试
