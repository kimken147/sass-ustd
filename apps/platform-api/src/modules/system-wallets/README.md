# 系統商錢包管理模組

## 功能概述

本模組提供系統商（Platform）錢包的管理功能，包括：

- ✅ 創建系統商錢包（支援兩種類型）
- ✅ 查詢所有錢包（支援按類型、區塊鏈、狀態過濾）
- ✅ 根據 ID 或地址查詢
- ✅ 獲取預設錢包（按類型）
- ✅ 更新錢包資訊
- ✅ 設置預設錢包
- ✅ 驗證錢包地址
- ✅ 刪除錢包（軟刪除）

## 核心概念

### 系統商錢包類型

系統商錢包分為兩種類型：

#### 1. 執行合約的錢包 (`contract_execution`)
- **用途**：用於執行智能合約操作
- **功能**：
  - 調用投資合約
  - 處理合約交易
  - 執行自動化操作
- **特點**：需要私鑰簽名，用於主動操作

#### 2. 分潤的錢包 (`revenue_distribution`)
- **用途**：用於接收系統費收入
- **功能**：
  - 接收系統費（System Fee）
  - 累計收入統計
  - 財務報表追蹤
- **特點**：只接收資金，不需要主動操作

### 分潤流程

```
投資 1000 USDT (100%)
├─ 系統費 10% = 100 USDT → 系統商分潤錢包
├─ 租戶收入 60% = 600 USDT → 租戶分潤錢包組
└─ 代理佣金 30% = 300 USDT → 代理樹
```

### 預設錢包規則

- **每個類型 + 每個區塊鏈**只能有一個預設錢包
- 例如：
  - TRON 鏈的執行合約錢包（預設）
  - TRON 鏈的分潤錢包（預設）
  - Ethereum 鏈的執行合約錢包（預設）
  - Ethereum 鏈的分潤錢包（預設）
- 創建租戶時，根據需求使用對應類型的預設錢包
- 預設錢包必須是 `ACTIVE` 狀態

## API 端點

### 1. 創建系統商錢包

**創建執行合約錢包**：
```http
POST /api/system-wallets
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "執行合約錢包",
  "address": "TXYZabcdefghijklmnopqrstuvwxyz123456",
  "type": "contract_execution",
  "chain": "tron",
  "isDefault": true,
  "description": "用於執行智能合約操作"
}
```

**創建分潤錢包**：
```http
POST /api/system-wallets
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "系統費分潤錢包",
  "address": "TABCdefghijklmnopqrstuvwxyz123456789",
  "type": "revenue_distribution",
  "chain": "tron",
  "isDefault": true,
  "description": "用於接收系統費收入"
}
```

**回應**：
```json
{
  "id": 1,
  "name": "主系統錢包",
  "address": "TXYZabcdefghijklmnopqrstuvwxyz123456",
  "chain": "tron",
  "status": "active",
  "isDefault": true,
  "verified": false,
  "totalRevenue": "0",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 2. 查詢所有錢包

```http
GET /api/system-wallets?type=revenue_distribution&chain=tron&status=active
Authorization: Bearer {accessToken}
```

**查詢參數**：
- `type` (可選): 過濾錢包類型（contract_execution, revenue_distribution）
- `chain` (可選): 過濾區塊鏈（tron, ethereum, bsc）
- `status` (可選): 過濾狀態（active, inactive, suspended）

### 3. 獲取預設錢包

**獲取預設分潤錢包**：
```http
GET /api/system-wallets/default?type=revenue_distribution&chain=tron
Authorization: Bearer {accessToken}
```

**獲取預設執行合約錢包**：
```http
GET /api/system-wallets/default?type=contract_execution&chain=tron
Authorization: Bearer {accessToken}
```

**查詢參數**：
- `type` (必填): 錢包類型（contract_execution, revenue_distribution）
- `chain` (可選): 區塊鏈（預設: tron）

### 4. 根據 ID 查詢

```http
GET /api/system-wallets/:id
Authorization: Bearer {accessToken}
```

### 5. 根據地址查詢

```http
GET /api/system-wallets/address/:address?chain=tron
Authorization: Bearer {accessToken}
```

### 6. 更新錢包

```http
PATCH /api/system-wallets/:id
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "主系統錢包（更新）",
  "status": "active"
}
```

### 7. 設置為預設錢包

```http
PATCH /api/system-wallets/:id/set-default
Authorization: Bearer {accessToken}
```

### 8. 驗證錢包地址

```http
PATCH /api/system-wallets/:id/verify
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "txHash": "0x1234567890abcdef..."
}
```

### 9. 刪除錢包（軟刪除）

```http
DELETE /api/system-wallets/:id
Authorization: Bearer {accessToken}
```

**注意**：無法刪除預設錢包，需要先設置其他錢包為預設。

## 使用流程

### 1. 創建系統商錢包

```bash
# 創建執行合約錢包
curl -X POST http://localhost:3000/api/system-wallets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "執行合約錢包",
    "address": "TXYZabcdefghijklmnopqrstuvwxyz123456",
    "type": "contract_execution",
    "chain": "tron",
    "isDefault": true
  }'

# 創建分潤錢包
curl -X POST http://localhost:3000/api/system-wallets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "系統費分潤錢包",
    "address": "TABCdefghijklmnopqrstuvwxyz123456789",
    "type": "revenue_distribution",
    "chain": "tron",
    "isDefault": true
  }'
```

### 2. 驗證錢包地址

```bash
# 通過發送一筆小額交易驗證錢包
curl -X PATCH http://localhost:3000/api/system-wallets/1/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "txHash": "0x1234567890abcdef..."
  }'
```

### 3. 在創建租戶時使用

創建租戶時，系統會自動使用預設的系統商錢包。如果需要指定特定錢包，可以在後續的租戶更新中關聯。

## 注意事項

### 錢包地址格式

- **TRON**: 以 `T` 開頭，34 個字元
- **Ethereum/BSC**: 以 `0x` 開頭，42 個字元

### 預設錢包規則

1. **每個類型 + 每個區塊鏈**只能有一個預設錢包
   - 例如：TRON 鏈可以有兩個預設錢包（一個執行合約，一個分潤）
2. 設置新錢包為預設時，會自動取消**同類型同鏈**的舊預設錢包
3. 預設錢包必須是 `ACTIVE` 狀態
4. 無法刪除預設錢包

### 驗證機制

錢包驗證通過發送一筆小額交易來確認：
1. 從系統發送一筆小額 USDT 到錢包地址
2. 記錄交易 hash
3. 調用驗證 API 更新驗證狀態

### 累計收入追蹤

`totalRevenue` 欄位會自動追蹤該錢包收到的系統費總額，用於：
- 財務報表
- 收入統計
- 審計追蹤

## 與租戶的關聯

創建租戶時，系統會：
1. 查找預設的系統商錢包（根據租戶的 `cryptoConfig.supportedChains`）
2. 如果找到，將錢包地址記錄在 `SystemFeeDistribution` 中
3. 如果未找到預設錢包，會記錄警告但不會阻止創建

未來可以擴展：
- 在 `Tenant` entity 中添加 `systemWalletId` 欄位
- 允許為每個租戶指定不同的系統商錢包
