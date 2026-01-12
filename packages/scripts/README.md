# @saas-platform/scripts

平台管理工具腳本集合。

## 📋 可用腳本

### 1. 初始化 Platform User

創建一個新的平台管理員用戶。

#### 使用方式

##### 方式一：命令行參數（推薦）

```bash
# 使用完整參數
pnpm --filter @saas-platform/scripts init-platform-user \
  --username admin \
  --email admin@example.com \
  --password SecurePass123! \
  --name "管理員"

# 使用簡短參數
pnpm --filter @saas-platform/scripts init-platform-user \
  -u admin \
  -e admin@example.com \
  -p SecurePass123! \
  -n "管理員"
```

##### 方式二：交互式輸入

如果沒有提供所有參數，腳本會提示您輸入缺少的資訊：

```bash
pnpm --filter @saas-platform/scripts init-platform-user
```

#### 參數說明

| 參數 | 簡寫 | 必填 | 說明 |
|------|------|------|------|
| `--username` | `-u` | ✅ | 登入用戶名（至少 3 個字符） |
| `--email` | `-e` | ❌ | 電子郵件地址（可選，如果提供需符合格式） |
| `--password` | `-p` | ✅ | 密碼（至少 8 個字符） |
| `--name` | `-n` | ✅ | 顯示名稱 |

#### 環境變數

腳本會自動讀取以下環境變數（按優先順序）：

1. `DB_HOST` / `PLATFORM_DB_HOST` - 資料庫主機（預設: localhost）
2. `DB_PORT` / `PLATFORM_DB_PORT` - 資料庫端口（預設: 5432）
3. `DB_USER` / `PLATFORM_DB_USER` - 資料庫用戶（預設: postgres）
4. `DB_PASSWORD` / `PLATFORM_DB_PASSWORD` - 資料庫密碼（預設: postgres）
5. `DB_NAME` / `PLATFORM_DB_NAME` - 資料庫名稱（預設: saas_platform）

#### 驗證規則

- **用戶名**: 至少 3 個字符，在平台內必須唯一
- **電子郵件**: 可選，如果提供則必須符合標準電子郵件格式，在平台內必須唯一。如果未提供，將自動生成為 `{username}@platform.local`
- **密碼**: 至少 8 個字符
- **姓名**: 不能為空

#### 範例輸出

```
=== 初始化 Platform User ===

⏳ 正在連接資料庫...
✅ 資料庫連接成功
⏳ 正在創建用戶...

✅ Platform User 創建成功！

📋 用戶資訊:
   ID: 1
   用戶名: admin
   電子郵件: admin@example.com
   姓名: 管理員
   角色: platform_admin
   狀態: active
   創建時間: 2024-01-01T00:00:00.000Z

🎉 完成！
```

#### 錯誤處理

- 如果用戶名或電子郵件已存在，腳本會顯示錯誤並退出
- 如果資料庫連接失敗，會顯示詳細錯誤訊息
- 如果輸入驗證失敗，會列出所有錯誤項目

## 🔧 開發

### 添加新腳本

1. 在 `src/scripts/` 目錄下創建新的 TypeScript 文件
2. 在 `package.json` 的 `scripts` 區塊添加對應的命令
3. 更新此 README 文件

### 本地測試

```bash
# 安裝依賴
pnpm install

# 執行腳本
pnpm init-platform-user --username test --email test@example.com --password test123456 --name "測試用戶"
```
