# 認證架構設計

## 🎯 設計原則

### 1. **共享核心邏輯**
- 認證核心邏輯放在 `packages/auth` 包中
- 使用 `BaseAuthService` 提供共享功能
- 各 API 繼承並擴展特定功能

### 2. **角色分離**
- **platform-api**: 只允許 `PLATFORM_ADMIN`
- **tenant-api**: 允許 `TENANT_ADMIN`, `AGENT`, `CUSTOMER`
- 通過配置控制允許的角色

### 3. **代理不需要獨立 API**
- 代理屬於租戶，業務邏輯在 `tenant-api`
- 代理登入是 `tenant-api` 的特殊功能
- 使用代理碼 + 密碼登入

## 📊 架構圖

```
┌─────────────────────────────────────────┐
│      packages/auth (共享包)               │
├─────────────────────────────────────────┤
│  - JwtService                            │
│  - PasswordService                       │
│  - TokenBlacklistService                 │
│  - BaseAuthService (基礎認證邏輯)        │
│  - AuthConfig (配置)                     │
└─────────────────────────────────────────┘
           │                    │
           │                    │
    ┌──────▼──────┐    ┌────────▼────────┐
    │ platform-api│    │   tenant-api    │
    │  AuthModule │    │   AuthModule    │
    └─────────────┘    └─────────────────┘
           │                    │
           │                    │
    ┌──────▼──────┐    ┌────────▼────────┐
    │ AuthService │    │  AuthService    │
    │ (繼承)      │    │  (繼承+擴展)    │
    └─────────────┘    └─────────────────┘
                              │
                              │
                    ┌─────────▼─────────┐
                    │  agentLogin()     │
                    │  (代理登入)       │
                    └───────────────────┘
```

## 🔑 角色分配

### Platform API
```typescript
// 只允許平台管理員
allowedRoles: [UserRole.PLATFORM_ADMIN]
requireTenant: false
```

**使用場景**：
- 平台超級管理員登入
- 管理所有租戶
- 系統配置

### Tenant API
```typescript
// 允許租戶相關角色
allowedRoles: [
  UserRole.TENANT_ADMIN,  // 租戶管理員
  UserRole.AGENT,         // 代理商
  UserRole.CUSTOMER       // 投資客戶
]
requireTenant: true
```

**使用場景**：
- 租戶管理員登入
- 代理登入（使用代理碼）
- 客戶登入

## 🚀 實作細節

### 1. BaseAuthService

提供共享的認證邏輯：

```typescript
abstract class BaseAuthService {
  // 通用登入
  async login(email, password, tenantId?)
  
  // 刷新 Token
  async refreshToken(refreshToken)
  
  // 登出
  async logout(accessToken, refreshToken?)
  
  // 驗證用戶
  async validateUser(userId)
}
```

### 2. Platform API AuthService

```typescript
@Injectable()
export class AuthService extends BaseAuthService {
  protected readonly authConfig = AUTH_CONFIGS.PLATFORM;
  
  async login(loginDto: LoginDto) {
    return super.login(loginDto.email, loginDto.password);
  }
}
```

### 3. Tenant API AuthService

```typescript
@Injectable()
export class AuthService extends BaseAuthService {
  protected readonly authConfig = AUTH_CONFIGS.TENANT;
  
  // 普通登入
  async login(loginDto: LoginDto, tenantId?: number) {
    return super.login(loginDto.email, loginDto.password, tenantId);
  }
  
  // 代理登入（特有功能）
  async agentLogin(agentCode: string, password: string, tenantId: number) {
    // 1. 查找代理
    // 2. 驗證代理碼和密碼
    // 3. 生成 Token
  }
}
```

## 📝 API 端點對比

### Platform API
```
POST /api/auth/login      # 平台管理員登入
POST /api/auth/refresh    # 刷新 Token
POST /api/auth/logout     # 登出
POST /api/auth/me         # 獲取當前用戶
```

### Tenant API
```
POST /api/auth/login      # 租戶用戶登入（Admin/Agent/Customer）
POST /api/auth/agent      # 代理登入（使用代理碼）
POST /api/auth/refresh    # 刷新 Token
POST /api/auth/logout     # 登出
POST /api/auth/me         # 獲取當前用戶
```

## 🔐 代理登入流程

### 為什麼代理不需要獨立 API？

1. **業務邏輯屬於租戶**
   - 代理的業務（佣金、客戶、訂單）都在 tenant-api
   - 代理數據存儲在租戶資料庫中

2. **簡化架構**
   - 減少 API 數量
   - 降低維護成本
   - 統一認證邏輯

3. **靈活性**
   - 可以在 tenant-api 中擴展代理特定功能
   - 例如：代理推廣連結、代理統計等

### 代理登入實作

```typescript
// tenant-api/src/modules/auth/auth.controller.ts

@Post('agent')
@Public()
async agentLogin(@Body() dto: AgentLoginDto) {
  return this.authService.agentLogin(
    dto.agentCode,
    dto.password,
    dto.tenantId
  );
}
```

**代理登入 DTO**：
```typescript
export class AgentLoginDto {
  @IsString()
  agentCode: string;  // 代理碼
  
  @IsString()
  @MinLength(6)
  password: string;
  
  @IsNumber()
  tenantId: number;    // 租戶 ID（從子域名或 header 獲取）
}
```

## 🎨 配置化設計

### AuthConfig 接口

```typescript
interface AuthConfig {
  allowedRoles: UserRole[];  // 允許的角色
  requireTenant: boolean;     // 是否需要租戶
  apiName: string;            // API 名稱
}
```

### 預設配置

```typescript
export const AUTH_CONFIGS = {
  PLATFORM: {
    allowedRoles: [UserRole.PLATFORM_ADMIN],
    requireTenant: false,
    apiName: "Platform API",
  },
  TENANT: {
    allowedRoles: [
      UserRole.TENANT_ADMIN,
      UserRole.AGENT,
      UserRole.CUSTOMER
    ],
    requireTenant: true,
    apiName: "Tenant API",
  },
};
```

## ✅ 優點

1. **代碼復用**
   - 核心邏輯共享，減少重複代碼
   - 統一維護和更新

2. **靈活性**
   - 每個 API 可以擴展特定功能
   - 代理登入只在 tenant-api 中

3. **清晰的分離**
   - 角色和 API 的對應關係明確
   - 易於理解和維護

4. **易於擴展**
   - 新增角色或 API 只需配置
   - 不需要修改核心邏輯

## 🔄 未來擴展

### 如果需要更細粒度的控制

可以創建更多配置：

```typescript
TENANT_ADMIN_ONLY: {
  allowedRoles: [UserRole.TENANT_ADMIN],
  requireTenant: true,
  apiName: "Tenant Admin API",
},
AGENT_ONLY: {
  allowedRoles: [UserRole.AGENT],
  requireTenant: true,
  apiName: "Agent API",
},
```

### 如果需要獨立代理 API（不推薦）

如果未來真的需要，可以：
1. 創建 `agent-api`
2. 使用 `AUTH_CONFIGS.AGENT_ONLY`
3. 但業務邏輯仍應在 tenant-api

## 📋 總結

**推薦架構**：
- ✅ 共享認證核心邏輯（`packages/auth`）
- ✅ Platform API 只處理平台管理員
- ✅ Tenant API 處理租戶相關所有角色（包括代理）
- ✅ 代理登入作為 tenant-api 的特殊功能
- ❌ 不需要獨立的 agent-api

**理由**：
1. 代理屬於租戶，業務邏輯在 tenant-api
2. 簡化架構，降低維護成本
3. 保持靈活性，易於擴展
