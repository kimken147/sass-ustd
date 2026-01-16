# 分潤模型說明

## 樹狀圖

```mermaid
flowchart TD
    A[會員投資<br/>100 USDT] --> B{第一層分配}

    B --> C[系統費<br/>100 × 10% = 10 USDT]
    B --> D[站長實收<br/>100 - 10 - 70 = 20 USDT]
    B --> E[傳給下級<br/>100 × 70% = 70 USDT]

    C --> F[平台錢包]
    D --> G[站長錢包]
    E --> H{代理B<br/>收到: 70 USDT<br/>selfRate: 20%}

    H --> I[代理B收益<br/>70 × 20% = 14 USDT]
    H --> J[傳給下級<br/>70 × 80% = 56 USDT]

    I --> K[代理B錢包]
    J --> L{代理A<br/>收到: 56 USDT<br/>selfRate: 100%}

    L --> M[代理A收益<br/>56 USDT]

    M --> N[代理A錢包]

    style A fill:#e1f5fe
    style C fill:#ffcdd2
    style D fill:#c8e6c9
    style E fill:#fff9c4
    style I fill:#c8e6c9
    style J fill:#fff9c4
    style M fill:#c8e6c9
    style F fill:#ffcdd2
    style G fill:#c8e6c9
    style K fill:#c8e6c9
    style N fill:#c8e6c9
```

## 最終分配結果

| 角色 | 金額 | 比例 |
|------|------|------|
| 平台 | 10 USDT | 10% |
| 站長 | 20 USDT | 20% |
| 代理B | 14 USDT | 14% |
| 代理A | 56 USDT | 56% |
| **總計** | **100 USDT** | **100%** |

## 計算公式

### 第一層（站長）
```
系統費 = 總金額 × systemFeeRate
傳給下級 = 總金額 × (1 - selfRate)
站長實收 = 總金額 - 系統費 - 傳給下級
         = 總金額 × selfRate - 系統費
```

### 後續層（代理）
```
保留 = 收到金額 × selfRate
傳給下級 = 收到金額 × (1 - selfRate)
```

## 代理樹結構

```
站長 (selfRate: 30%)
  └── 代理B (selfRate: 20%)
        └── 代理A (selfRate: 100%)
              └── 會員
```

## 資金流向

```
會員投資 100 USDT
    │
    ├──→ 平台: 10 USDT (系統費)
    │
    ├──→ 站長: 20 USDT (30% - 系統費)
    │
    └──→ 代理池: 70 USDT
              │
              ├──→ 代理B: 14 USDT (70 × 20%)
              │
              └──→ 代理A: 56 USDT (70 × 80%)
```
