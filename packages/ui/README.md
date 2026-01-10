# @saas-platform/ui

共享 UI 組件庫，基於 shadcn/ui 和 Tailwind CSS。

## 📦 組件來源

本包使用 **shadcn/ui** 作為 UI 組件的基礎。所有組件都應該通過 shadcn/ui 官方 CLI 安裝，以確保：

- ✅ 使用最新的官方實現
- ✅ 保持與 shadcn/ui 生態系統的一致性
- ✅ 自動獲得 bug 修復和改進

## 🚀 添加新組件

### 如果 shadcn/ui 有提供該組件

**必須使用官方 CLI 安裝**：

```bash
cd packages/ui
pnpm dlx shadcn@latest add <component-name> --yes --overwrite
```

例如：
```bash
# 安裝 Select 組件
pnpm dlx shadcn@latest add select --yes --overwrite

# 安裝 Dialog 組件
pnpm dlx shadcn@latest add dialog --yes --overwrite

# 安裝 Table 組件
pnpm dlx shadcn@latest add table --yes --overwrite
```

### 安裝後需要做的事

1. **檢查導入路徑**：確保組件中的 `cn` 工具函數導入路徑正確
   ```tsx
   // 應該是相對路徑
   import { cn } from "../../lib/utils"
   ```
   如果 CLI 生成的是絕對路徑（如 `src/lib/utils`），請手動改為相對路徑。

2. **更新導出**：在 `src/index.ts` 中添加新組件的導出
   ```tsx
   export {
     Select,
     SelectGroup,
     SelectValue,
     // ... 其他導出
   } from './components/ui/select';
   ```

3. **檢查依賴**：確保 `package.json` 中包含所需的依賴（通常 CLI 會自動添加）

### 如果 shadcn/ui 沒有提供該組件

如果需要的組件在 shadcn/ui 中不存在，可以：

1. 查看 [shadcn/ui 組件列表](https://ui.shadcn.com/docs/components) 確認是否真的沒有
2. 如果確實沒有，可以：
   - 基於 Radix UI 或其他基礎庫自行實現
   - 參考現有組件的結構和樣式
   - 確保遵循相同的設計模式和命名慣例

## 📋 當前已安裝的組件

- ✅ Button
- ✅ Card
- ✅ Input
- ✅ Label
- ✅ Select

## 🔧 配置

組件配置位於 `components.json`，包含：

- 樣式配置（Tailwind CSS）
- 路徑別名
- TypeScript 設置

## 📚 使用方式

在應用中導入組件：

```tsx
import { Button, Select, Card } from "@saas-platform/ui";

function MyComponent() {
  return (
    <Card>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="選擇選項" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">選項 1</SelectItem>
        </SelectContent>
      </Select>
      <Button>按鈕</Button>
    </Card>
  );
}
```

## 🎨 自定義樣式

組件使用 CSS 變量進行主題定制。樣式定義在 `src/index.css` 中。

## 📖 參考文檔

- [shadcn/ui 官方文檔](https://ui.shadcn.com)
- [Radix UI 文檔](https://www.radix-ui.com)
- [Tailwind CSS 文檔](https://tailwindcss.com)
