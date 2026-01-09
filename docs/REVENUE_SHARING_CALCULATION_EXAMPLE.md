# 完整分潤計算範例

## 🎯 最終確認的分潤模式

```
投資金額 1000 USDT (100%)
    ├─ 系統費 10% = 100 USDT
    ├─ 代理佣金 30% = 300 USDT
    └─ 租戶收入 60% = 600 USDT
    
✅ 100% 全部分配完畢
❌ 沒有「淨投資金額」概念
```

---

## 💰 詳細計算流程

### 配置

```typescript
// Platform 設定（系統商錢包）
const systemWallets = [
  {
    id: 1,
    type: 'CONTRACT_EXECUTION',
    address: 'TContract...',
    name: '執行合約錢包',
  },
  {
    id: 2,
    type: 'REVENUE_DISTRIBUTION',
    address: 'TRevenue1...',
    name: '分潤錢包 1',
  },
  {
    id: 3,
    type: 'REVENUE_DISTRIBUTION',
    address: 'TRevenue2...',
    name: '分潤錢包 2',
  },
];

// Tenant 設定
const tenant = {
  systemFeeRate: 10.0,  // 系統費 10%（由總後台設定）
  systemWallets: [       // 系統錢包指派（用於分潤）
    { walletId: 2, address: 'TRevenue1...', name: '分潤錢包 1', percentage: 60 },
    { walletId: 3, address: 'TRevenue2...', name: '分潤錢包 2', percentage: 40 },
  ],  // 比例總和必須 = 100%
  cryptoConfig: {
    tenantRevenueRate: 60.0,      // 租戶收入 60%
    agentCommissionRate: 30.0,    // 代理佣金 30%
  },
  revenueWallets: [
    { 
      id: 'w1', 
      address: 'TXxx...', 
      percentage: 60, 
      verified: false 
    },
    { 
      id: 'w2', 
      address: 'TYyy...', 
      percentage: 30, 
      verified: true 
    },
    { 
      id: 'w3', 
      address: 'TZzz...', 
      percentage: 10, 
      verified: true 
    },
  ]
};

// 代理結構
const topAgent = {        // 頂級代理（租戶本人）
  parentAgent: null,
  level: 0,
  commission: { 
    baseRate: 30.0, 
    selfRate: 100,    // 🔑 頂級代理拿全部
    uplineRate: 0 
  },
  wallet: { address: 'TTopAgent...', verified: true }
};

const agentB = {         // Level 1
  parentAgent: topAgent,
  level: 1,
  commission: { baseRate: 30.0, selfRate: 60, uplineRate: 40 },
  wallet: { address: 'TAgentB...', verified: true }
};

const agentC = {         // Level 2（直接推薦人）
  parentAgent: agentB,
  level: 2,
  commission: { baseRate: 30.0, selfRate: 50, uplineRate: 50 },
  wallet: { address: 'TAgentC...', verified: false }
};

const customer = {
  wallet: { address: 'TCustomer...' }
};
```

---

## 🔢 計算步驟

### 投資金額：1000 USDT

```typescript
const investment = 1000;

// ==================== 1️⃣ 系統費 ====================

const systemFee = investment * (tenant.systemFeeRate / 100);
// = 1000 × 10% = 100 USDT

// 按 tenant.systemWallets 的比例分配到多個系統錢包
const systemFeeDistributions = tenant.systemWallets.map(sw => {
  const amount = systemFee * (sw.percentage / 100);
  return {
    tenant: tenant,
    customer: customer,
    amount: amount.toFixed(6),
    originalAmount: '1000.000000',
    feeRate: 10.0,
    systemWalletAddress: sw.address,
    systemWalletId: sw.walletId,
    status: 'pending'
  };
});

// 💸 實時轉帳（逐個系統錢包）
for (const dist of systemFeeDistributions) {
  const txHash = await transferUSDT(dist.systemWalletAddress, dist.amount);
  dist.txHash = txHash;
  dist.status = 'completed';
  dist.completedAt = new Date();
  console.log(`✅ 系統費: ${dist.amount} USDT → ${dist.systemWalletAddress} (${dist.systemWalletId})`);
}

// 範例輸出：
// ✅ 系統費: 60.000000 USDT → TRevenue1... (2)
// ✅ 系統費: 40.000000 USDT → TRevenue2... (3)

// ==================== 2️⃣ 租戶收入 ====================

const tenantRevenue = investment * (tenant.cryptoConfig.tenantRevenueRate / 100);
// = 1000 × 60% = 600 USDT

// 創建 revenue_distribution 記錄
const revenueDistribution = {
  tenant: tenant,
  customer: customer,
  totalAmount: '600.000000',
  originalAmount: '1000.000000',
  revenueRate: 60.0,
  walletDistributions: [
    {
      walletId: 'w1',
      walletName: '營運錢包',
      walletAddress: 'TXxx...',
      percentage: 60,
      amount: '360.000000',  // 600 × 60% = 360
      status: 'pending',
      isFirstPayout: true  // 🔑 第一次分潤
    },
    {
      walletId: 'w2',
      walletName: '技術錢包',
      walletAddress: 'TYyy...',
      percentage: 30,
      amount: '180.000000',  // 600 × 30% = 180
      status: 'pending'
    },
    {
      walletId: 'w3',
      walletName: '儲備錢包',
      walletAddress: 'TZzz...',
      percentage: 10,
      amount: '60.000000',   // 600 × 10% = 60
      status: 'pending'
    },
  ],
  status: 'pending'
};

// 💸 實時轉帳（逐個錢包）
for (const wallet of revenueDistribution.walletDistributions) {
  try {
    const txHash = await transferUSDT(wallet.walletAddress, wallet.amount);
    wallet.txHash = txHash;
    wallet.status = 'completed';
    wallet.completedAt = new Date();
    
    // 🔑 第一次分潤自動驗證
    if (wallet.isFirstPayout) {
      const tenantWallet = tenant.revenueWallets.find(w => w.id === wallet.walletId);
      tenantWallet.verified = true;
      tenantWallet.verifiedAt = new Date();
      tenantWallet.verificationTxHash = txHash;
      console.log(`✅ 錢包 ${wallet.walletName} 驗證成功`);
    }
    
    console.log(`✅ 租戶收入: ${wallet.amount} USDT → ${wallet.walletAddress}`);
  } catch (error) {
    wallet.status = 'failed';
    wallet.error = error.message;
  }
}

revenueDistribution.status = 'completed';
revenueDistribution.completedAt = new Date();

// ==================== 3️⃣ 代理佣金 ====================

const totalCommission = investment * (tenant.cryptoConfig.agentCommissionRate / 100);
// = 1000 × 30% = 300 USDT

// 3.1 Agent C (Level 2 - 直接推薦人)
const agentC_self = totalCommission * (agentC.commission.selfRate / 100);
const agentC_upline = totalCommission * (agentC.commission.uplineRate / 100);
// agentC_self = 300 × 50% = 150 USDT
// agentC_upline = 300 × 50% = 150 USDT

const payoutC = {
  tenant: tenant,
  agent: agentC,
  customer: customer,
  type: 'self',
  amount: '150.000000',
  originalInvestmentAmount: '1000.000000',
  commissionRate: 30.0,
  walletAddress: 'TAgentC...',
  isFirstPayout: true,  // 🔑 第一次分潤
  status: 'pending'
};

// 💸 實時轉帳
const txHashC = await transferUSDT('TAgentC...', '150.000000');
payoutC.txHash = txHashC;
payoutC.status = 'completed';
payoutC.completedAt = new Date();

// 🔑 第一次分潤自動驗證
if (!agentC.wallet.verified) {
  agentC.wallet.verified = true;
  agentC.wallet.verifiedAt = new Date();
  agentC.wallet.verificationTxHash = txHashC;
  console.log('✅ Agent C 錢包驗證成功');
}

agentC.stats.selfCommissionEarned += 150;
agentC.stats.totalCommissionEarned += 150;
agentC.stats.uplineCommissionPassed += 150;

console.log('✅ 代理佣金 (Agent C): 150 USDT → TAgentC...');

// 3.2 Agent B (Level 1)
const agentB_received = agentC_upline;  // 150 USDT
const agentB_self = agentB_received * (agentB.commission.selfRate / 100);
const agentB_upline = agentB_received * (agentB.commission.uplineRate / 100);
// agentB_self = 150 × 60% = 90 USDT
// agentB_upline = 150 × 40% = 60 USDT

const payoutB = {
  tenant: tenant,
  agent: agentB,
  customer: customer,
  sourceAgent: agentC,
  type: 'from_downline',
  amount: '90.000000',
  originalInvestmentAmount: '1000.000000',
  commissionRate: 30.0,
  receivedAmount: '150.000000',
  selfRate: 60.0,
  passedToUplineAmount: '60.000000',
  walletAddress: 'TAgentB...',
  status: 'pending'
};

// 💸 實時轉帳
await transferUSDT('TAgentB...', '90.000000');
payoutB.status = 'completed';
payoutB.completedAt = new Date();

agentB.stats.selfCommissionEarned += 90;
agentB.stats.totalCommissionEarned += 90;
agentB.stats.uplineCommissionPassed += 60;

console.log('✅ 代理佣金 (Agent B): 90 USDT → TAgentB...');

// 3.3 Top Agent (Level 0 - 租戶)
const topAgent_received = agentB_upline;  // 60 USDT
// selfRate = 100, uplineRate = 0
const topAgent_self = topAgent_received * 1.00;  // 60 USDT (全拿)

const payoutTop = {
  tenant: tenant,
  agent: topAgent,
  customer: customer,
  sourceAgent: agentB,
  type: 'from_downline',
  amount: '60.000000',
  originalInvestmentAmount: '1000.000000',
  commissionRate: 30.0,
  receivedAmount: '60.000000',
  selfRate: 100.0,
  passedToUplineAmount: '0',  // 無上級
  walletAddress: 'TTopAgent...',
  status: 'pending'
};

// 💸 實時轉帳
await transferUSDT('TTopAgent...', '60.000000');
payoutTop.status = 'completed';
payoutTop.completedAt = new Date();

topAgent.stats.selfCommissionEarned += 60;
topAgent.stats.totalCommissionEarned += 60;

console.log('✅ 代理佣金 (Top Agent - 租戶): 60 USDT → TTopAgent...');
```

---

## 📊 最終分配結果

```
投資金額: 1000 USDT (100%)

分配明細:
┌─────────────────────────────────────────┐
│ 系統費 (10%):                 100 USDT  │
│   ├─ 分潤錢包 1 (60%)          60 USDT  │
│   └─ 分潤錢包 2 (40%)          40 USDT  │
├─────────────────────────────────────────┤
│ 租戶收入 (60%):               600 USDT  │
│   ├─ 營運錢包 (60%)           360 USDT  │
│   ├─ 技術錢包 (30%)           180 USDT  │
│   └─ 儲備錢包 (10%)            60 USDT  │
├─────────────────────────────────────────┤
│ 代理佣金 (30%):               300 USDT  │
│   ├─ Agent C (Level 2)        150 USDT  │
│   ├─ Agent B (Level 1)         90 USDT  │
│   └─ Top Agent (Level 0)       60 USDT  │
└─────────────────────────────────────────┘

總計: 1000 USDT ✅
```

---

## ✅ 驗證

```typescript
// 驗證總和
const totalDistributed = 
  100 +              // 系統費
  (360 + 180 + 60) + // 租戶收入
  (150 + 90 + 60);   // 代理佣金

console.log(totalDistributed === 1000); // ✅ true

// 驗證比例
console.log(100 / 1000 === 0.10);   // ✅ 系統費 10%
console.log(600 / 1000 === 0.60);   // ✅ 租戶收入 60%
console.log(300 / 1000 === 0.30);   // ✅ 代理佣金 30%
```

---

## 🔄 完整流程圖

```
客戶投資 1000 USDT
    │
    ├─ 實時並行處理 ─┐
    │                │
    ▼                ▼
┌──────────┐    ┌──────────┐
│  系統費   │    │ 租戶收入  │
│  100 USDT │    │ 600 USDT │
└────┬─────┘    └────┬─────┘
     │               │
     │          ┌────┼────┬────┐
     │          │    │    │    │
     ▼          ▼    ▼    ▼    ▼
 TSystem... TXxx TYyy TZzz  代理佣金
   100 USDT  360  180  60   300 USDT
                              │
                    ┌─────────┼─────────┐
                    │         │         │
                    ▼         ▼         ▼
               Agent C   Agent B   Top Agent
               150 USDT  90 USDT  60 USDT
               
✅ 所有轉帳完成
✅ 錢包自動驗證
✅ 統計數據更新
```

---

## 🎯 關鍵重點

1. ✅ **100% 全部分配**
   - 系統費 + 租戶收入 + 代理佣金 = 投資金額
   - 沒有「淨投資金額」概念

2. ✅ **即時轉帳**
   - 投資完成立即分潤
   - 並行處理加快速度

3. ✅ **第一次驗證**
   - 錢包第一次收到分潤時自動驗證
   - 記錄 verificationTxHash

4. ✅ **頂級代理 = 租戶**
   - parentAgent = null
   - selfRate = 100%
   - uplineRate = 0%

5. ✅ **所有費率基於投資金額**
   - 系統費 = 投資金額 × 10%
   - 租戶收入 = 投資金額 × 60%
   - 代理佣金 = 投資金額 × 30%
