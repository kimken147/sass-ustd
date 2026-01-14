import { useState, useMemo } from "react";
import { useList, type CrudFilter } from "@refinedev/core";
import { useNavigate } from "react-router";
import { ListView } from "@saas-platform/ui";
import { Button } from "@saas-platform/ui";
import { Input } from "@saas-platform/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@saas-platform/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@saas-platform/ui";
import { Search, Calendar, Plus } from "lucide-react";
import { SystemWallet, SystemWalletType } from "@saas-platform/shared-types";
import { formatDateTimeLocalized } from "@saas-platform/utils";

// 類型映射
const typeMap: Record<string, string> = {
  [SystemWalletType.CONTRACT_EXECUTION]: "授權",
  [SystemWalletType.REVENUE_DISTRIBUTION]: "收款",
};

export default function WalletsPage() {
  const navigate = useNavigate();

  // 篩選狀態
  const [filters, setFilters] = useState({
    name: "",
    type: "",
    status: "",
    createdAt: "",
  });

  // 構建查詢參數
  const queryParams = useMemo(() => {
    const params: CrudFilter[] = [];
    if (filters.name) {
      params.push({ field: "name", operator: "contains", value: filters.name });
    }
    if (filters.type) {
      params.push({ field: "type", operator: "eq", value: filters.type });
    }
    if (filters.status) {
      params.push({ field: "status", operator: "eq", value: filters.status });
    }
    // createdAt 需要根據實際 API 格式處理，暫時不處理
    return params;
  }, [filters]);

  // 獲取錢包列表
  const walletsQuery = useList<SystemWallet>({
    resource: "system-wallets",
    filters: queryParams,
  });

  const wallets = walletsQuery.result?.data || [];
  const isLoading = walletsQuery.query.isLoading;
  const isError = walletsQuery.query.isError;
  const error = walletsQuery.query.error;

  // 處理篩選變更
  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 處理查詢
  const handleSearch = () => {
    // 觸發重新查詢（通過 filters 變更）
    walletsQuery.query.refetch();
  };

  // 獲取分配比例（需要從站點配置中獲取，這裡暫時顯示 "-"）
  const getPercentage = (_wallet: SystemWallet) => {
    // TODO: 從站點配置中獲取該錢包的分配比例
    // 目前暫時返回 "-"
    return "-";
  };

  // 導航到創建頁面
  const handleCreateWallet = () => {
    navigate("/wallets/create");
  };

  return (
    <ListView>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">錢包列表</h2>
        <Button onClick={handleCreateWallet}>
          <Plus className="w-4 h-4 mr-2" />
          新增錢包
        </Button>
      </div>

      {/* 篩選區域 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>篩選條件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* 建立時間 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">建立時間</label>
              <div className="relative">
                <Input
                  type="date"
                  placeholder="請選擇時間"
                  value={filters.createdAt}
                  onChange={(e) =>
                    handleFilterChange("createdAt", e.target.value)
                  }
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* 名稱 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">名稱</label>
              <Input
                placeholder="請輸入名稱"
                value={filters.name}
                onChange={(e) => handleFilterChange("name", e.target.value)}
              />
            </div>

            {/* 狀態 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">狀態</label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  handleFilterChange("status", value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="請選擇狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="active">啟用</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                  <SelectItem value="suspended">暫停</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 類型 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">類型</label>
              <Select
                value={filters.type || "all"}
                onValueChange={(value) =>
                  handleFilterChange("type", value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="請選擇類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value={SystemWalletType.CONTRACT_EXECUTION}>
                    授權
                  </SelectItem>
                  <SelectItem value={SystemWalletType.REVENUE_DISTRIBUTION}>
                    收款
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 查詢按鈕 */}
            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full"
              >
                <Search className="w-4 h-4 mr-2" />
                查詢
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 錯誤提示 */}
      {isError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-6">
          {error?.message || "獲取錢包列表失敗"}
        </div>
      )}

      {/* 載入狀態 */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      )}

      {/* 錢包列表表格 */}
      {!isLoading && wallets.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">類型</th>
                    <th className="text-left p-4 font-medium">錢包名稱</th>
                    <th className="text-left p-4 font-medium">地址</th>
                    <th className="text-left p-4 font-medium">分配比例%</th>
                    <th className="text-left p-4 font-medium">建立時間</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((wallet) => {
                    return (
                      <tr
                        key={wallet.id}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="p-4">
                          {typeMap[wallet.type] || wallet.type}
                        </td>
                        <td className="p-4">{wallet.name}</td>
                        <td className="p-4 font-mono text-sm">
                          {wallet.address}
                        </td>
                        <td className="p-4">{getPercentage(wallet)}</td>
                        <td className="p-4">
                          {formatDateTimeLocalized(wallet.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 空狀態 */}
      {!isLoading && wallets.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            暫無錢包數據
          </CardContent>
        </Card>
      )}
    </ListView>
  );
}
