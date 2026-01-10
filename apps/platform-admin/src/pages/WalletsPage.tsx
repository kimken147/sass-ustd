import { useState, useMemo } from "react";
import { useList, useCreate, type CrudFilter } from "@refinedev/core";
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
import { Search, Calendar, Plus, Trash2 } from "lucide-react";
import { SystemWallet, SystemWalletType } from "@saas-platform/shared-types";
import { formatDateTimeLocalized } from "@saas-platform/utils";

// 類型映射
const typeMap: Record<string, string> = {
  [SystemWalletType.CONTRACT_EXECUTION]: "授權",
  [SystemWalletType.REVENUE_DISTRIBUTION]: "收款",
};

// 新增錢包表單數據類型
interface NewWalletFormData {
  type: string;
  name: string;
  address: string;
  percentage: string; // 僅用於收款類型
}

export default function WalletsPage() {
  // 篩選狀態
  const [filters, setFilters] = useState({
    name: "",
    type: "",
    status: "",
    createdAt: "",
  });

  // 新增錢包表單狀態
  const [newWallets, setNewWallets] = useState<NewWalletFormData[]>([]);
  const [isAddingMode, setIsAddingMode] = useState(false);

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

  // 批量創建錢包（使用 useCreate 循環調用，因為 useCreateMany 可能不可用）
  const createMutation = useCreate();
  const { mutate: createWallet, mutation } = createMutation;
  const isCreating = mutation?.isPending || false;

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

  // 添加新的空錢包表單
  const handleAddNewWallet = () => {
    setIsAddingMode(true);
    setNewWallets((prev) => [
      ...prev,
      {
        type: "",
        name: "",
        address: "",
        percentage: "",
      },
    ]);
  };

  // 移除新增的錢包表單
  const handleRemoveNewWallet = (index: number) => {
    setNewWallets((prev) => prev.filter((_, i) => i !== index));
    if (newWallets.length === 1) {
      setIsAddingMode(false);
    }
  };

  // 更新新增錢包表單數據
  const handleUpdateNewWallet = (
    index: number,
    field: keyof NewWalletFormData,
    value: string
  ) => {
    setNewWallets((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  // 計算收款類型錢包的總比例
  const totalRevenuePercentage = useMemo(() => {
    return newWallets
      .filter((w) => w.type === SystemWalletType.REVENUE_DISTRIBUTION)
      .reduce((sum, w) => {
        const percentage = parseFloat(w.percentage) || 0;
        return sum + percentage;
      }, 0);
  }, [newWallets]);

  // 提交新增的錢包
  const handleSubmitNewWallets = () => {
    // 驗證必填字段
    for (const wallet of newWallets) {
      if (!wallet.type || !wallet.name || !wallet.address) {
        alert("請填寫所有必填字段");
        return;
      }
      // 如果是收款類型，必須填寫比例
      if (
        wallet.type === SystemWalletType.REVENUE_DISTRIBUTION &&
        (!wallet.percentage || parseFloat(wallet.percentage) <= 0)
      ) {
        alert("收款類型錢包必須填寫分配比例");
        return;
      }
    }

    // 驗證收款類型總比例必須為 100%
    if (totalRevenuePercentage !== 100) {
      alert(
        `收款類型錢包的分配比例總和必須為 100%，當前為 ${totalRevenuePercentage}%`
      );
      return;
    }

    // 構建創建數據
    const createDataArray = newWallets.map((wallet) => ({
      name: wallet.name,
      address: wallet.address,
      type: wallet.type,
      chain: "tron" as const,
      status: "active" as const,
    }));

    // 逐個創建錢包（因為 useCreateMany 可能不可用）
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    const createNext = (index: number) => {
      if (index >= createDataArray.length) {
        // 所有錢包創建完成
        if (errorCount === 0) {
          // 全部成功
          setNewWallets([]);
          setIsAddingMode(false);
          walletsQuery.query.refetch();
        } else {
          // 有部分失敗
          alert(
            `成功創建 ${successCount} 個錢包，失敗 ${errorCount} 個。\n錯誤：${errors.join("\n")}`
          );
          walletsQuery.query.refetch();
        }
        return;
      }

      createWallet(
        {
          resource: "system-wallets",
          values: createDataArray[index],
        },
        {
          onSuccess: () => {
            successCount++;
            createNext(index + 1);
          },
          onError: (error: any) => {
            errorCount++;
            errors.push(
              `${createDataArray[index].name}: ${error?.message || "創建失敗"}`
            );
            createNext(index + 1);
          },
        }
      );
    };

    // 開始創建第一個
    createNext(0);
  };

  // 取消新增
  const handleCancelNewWallets = () => {
    setNewWallets([]);
    setIsAddingMode(false);
  };

  return (
    <ListView>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">錢包列表</h2>
        <Button
          onClick={handleAddNewWallet}
          disabled={isCreating}
          variant={isAddingMode ? "outline" : "default"}
        >
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
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="請選擇狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
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
                value={filters.type}
                onValueChange={(value) => handleFilterChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="請選擇類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
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
      {!isLoading && (wallets.length > 0 || newWallets.length > 0) && (
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
                    {isAddingMode && (
                      <th className="text-left p-4 font-medium">操作</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {/* 現有錢包列表 */}
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
                        {isAddingMode && <td className="p-4"></td>}
                      </tr>
                    );
                  })}

                  {/* 新增錢包表單行 */}
                  {newWallets.map((newWallet, index) => (
                    <tr key={`new-${index}`} className="border-b bg-muted/30">
                      <td className="p-4">
                        <Select
                          value={newWallet.type}
                          onValueChange={(value) =>
                            handleUpdateNewWallet(index, "type", value)
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="請選擇類型" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              value={SystemWalletType.CONTRACT_EXECUTION}
                            >
                              授權
                            </SelectItem>
                            <SelectItem
                              value={SystemWalletType.REVENUE_DISTRIBUTION}
                            >
                              收款
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        <Input
                          placeholder="請輸入錢包名稱"
                          value={newWallet.name}
                          onChange={(e) =>
                            handleUpdateNewWallet(index, "name", e.target.value)
                          }
                        />
                      </td>
                      <td className="p-4">
                        <Input
                          placeholder="請輸入錢包地址"
                          value={newWallet.address}
                          onChange={(e) =>
                            handleUpdateNewWallet(
                              index,
                              "address",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="p-4">
                        {newWallet.type ===
                        SystemWalletType.REVENUE_DISTRIBUTION ? (
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="請輸入比例 %"
                            value={newWallet.percentage}
                            onChange={(e) =>
                              handleUpdateNewWallet(
                                index,
                                "percentage",
                                e.target.value
                              )
                            }
                          />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-muted-foreground">-</span>
                      </td>
                      <td className="p-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveNewWallet(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 新增錢包時的總比例和操作按鈕 */}
      {isAddingMode && newWallets.length > 0 && (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">合計：</span>
                <span
                  className={`text-lg font-bold ${
                    totalRevenuePercentage === 100
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {totalRevenuePercentage}%
                </span>
                {totalRevenuePercentage !== 100 && (
                  <span className="text-sm text-destructive">
                    *未達100%請重新分配
                  </span>
                )}
              </div>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelNewWallets}
                  disabled={isCreating}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmitNewWallets}
                  disabled={isCreating || totalRevenuePercentage !== 100}
                >
                  {isCreating ? "建立中..." : "完成"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 空狀態 */}
      {!isLoading && wallets.length === 0 && newWallets.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            暫無錢包數據
          </CardContent>
        </Card>
      )}
    </ListView>
  );
}
