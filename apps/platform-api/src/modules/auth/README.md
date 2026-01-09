# 認證模組說明

## 功能概述

本模組實作了完整的 JWT 認證系統，包含：

- ✅ 帳號密碼登入
- ✅ JWT Access Token + Refresh Token
- ✅ Token 黑名單機制（登出功能）
- ✅ 自動 Token 刷新
- ✅ 用戶資訊獲取

## 登出功能設計

### 推薦方案：Token 黑名單（Token Blacklist）

**實作方式**：
1. **開發環境**：使用內存 Map 存儲（`InMemoryTokenBlacklistService`）
2. **生產環境**：使用 Redis 存儲（`RedisTokenBlacklistService`）

**優點**：
- ✅ 立即撤銷 Token（登出後立即失效）
- ✅ 支援多設備登入管理
- ✅ 安全性高
- ✅ 使用 Redis 時支援分散式部署

**工作流程**：
```
1. 用戶登入 → 生成 Access Token + Refresh Token
2. 用戶登出 → 將兩個 Token 加入黑名單
3. 後續請求 → Guard 檢查 Token 是否在黑名單中
4. 如果 Token 在黑名單中 → 拒絕請求（401 Unauthorized）
```

## API 端點

### 1. 登入
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@platform.com",
  "password": "SecurePassword123!"
}
```

**回應**：
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": 1,
    "email": "admin@platform.com",
    "name": "Admin User",
    "role": "platform_admin"
  }
}
```

### 2. 刷新 Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. 登出
```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // 可選
}
```

**說明**：
- Access Token 會自動從請求頭提取
- Refresh Token 可選，如果提供會同時撤銷

### 4. 獲取當前用戶
```http
POST /api/auth/me
Authorization: Bearer {accessToken}
```

## 使用方式

### 在 Controller 中使用 Guard

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@saas-platform/database';

@Controller('example')
export class ExampleController {
  @Get('protected')
  @UseGuards(JwtAuthGuard)
  async protectedRoute(@CurrentUser() user: User) {
    return { message: `Hello ${user.name}` };
  }
}
```

### 標記公開路由

```typescript
import { Public } from '../auth/decorators/public.decorator';

@Controller('example')
export class ExampleController {
  @Get('public')
  @Public() // 跳過認證
  async publicRoute() {
    return { message: 'This is public' };
  }
}
```

## 環境變數配置

```env
# JWT 配置
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_ACCESS_EXPIRES_IN=15m    # Access Token 過期時間
JWT_REFRESH_EXPIRES_IN=7d   # Refresh Token 過期時間

# Redis 配置（生產環境）
REDIS_URL=redis://localhost:6379
```

## 生產環境建議

### 1. 使用 Redis 作為 Token 黑名單存儲

修改 `auth.module.ts`：

```typescript
{
  provide: TokenBlacklistService,
  useFactory: async (configService: ConfigService) => {
    const redisClient = createClient({ 
      url: configService.get('REDIS_URL') 
    });
    await redisClient.connect();
    return new RedisTokenBlacklistService(redisClient);
  },
  inject: [ConfigService],
}
```

### 2. 安全建議

- ✅ 使用強隨機字串作為 JWT Secret
- ✅ Access Token 設置較短過期時間（15-30 分鐘）
- ✅ Refresh Token 設置較長過期時間（7-30 天）
- ✅ 使用 HTTPS 傳輸 Token
- ✅ 定期輪換 JWT Secret
- ✅ 監控異常登入行為

### 3. 多設備登入管理（可選擴展）

可以擴展功能支援：
- 記錄每個設備的 Token
- 支援單設備登出
- 支援所有設備登出
- 顯示活躍設備列表

## 測試

### 使用 curl 測試

```bash
# 1. 登入
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@platform.com","password":"password123"}'

# 2. 使用 Access Token 訪問受保護路由
curl -X POST http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer {accessToken}"

# 3. 刷新 Token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"{refreshToken}"}'

# 4. 登出
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"{refreshToken}"}'
```

## 故障排除

### Token 驗證失敗
- 檢查 JWT Secret 是否正確
- 檢查 Token 是否過期
- 檢查 Token 是否在黑名單中

### 登出後仍可使用 Token
- 確認 Token 黑名單服務正常運行
- 檢查 Redis 連接（如果使用 Redis）
- 確認 Guard 正確檢查黑名單
