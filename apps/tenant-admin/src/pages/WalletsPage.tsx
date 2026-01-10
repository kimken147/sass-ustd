import { useState, useMemo } from "react";
import { useList, useCreate, useUpdate, useDelete } from "@refinedev/core";
import { ListView, ListViewHeader } from "@saas-platform/ui";
import { Button } from "@saas-platform/ui";
import { Input } from "@saas-platform/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@saas-platform/ui";
import { Calendar, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { formatDateTime, getTodayStartLocal } from "@saas-platform/utils";

// RevenueWallet 類型定義（從 @saas-platform/database 複製）
interface RevenueWallet {
  id: string;
  name: string;
  address: string;
  chain: "tron";
  percentage: number;
  isActive: boolean;
  verified: boolean;
  verifiedAt?: Date | string;
  verificationTxHash?: string;
  totalPaidAmount: number;
  lastPaidAt?: Date | string;
  description?: string;
}

// 新增/編輯錢包表單數據類型
interface WalletFormData {
  id?: string;
  name: string;
  address: string;
  percentage: string;
  description?: string;
}

export default function WalletsPage() {
  // 篩選狀態
  const [filters, setFilters] = useState({
    name: "",
    createdAt: getTodayStartLocal(), // 預設為當天 00:00
  });

  // 編輯狀態
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [walletForm, setWalletForm] = useState<WalletFormData>({
    name: "",
    address: "",
    percentage: "",
    description: "",
  });

  // 構建查詢參數（用於名稱篩選）
  const queryParams = useMemo(() => {
    const params: any[] = [];
    if (filters.name) {
      params.push({ field: "name", operator: "contains", value: filters.name });
    }
    return params;
  }, [filters.name]);

  // 獲取錢包列表 - 使用官方 useList hook
  const walletsQuery = useList<RevenueWallet>({
    resource: "revenue-wallets",
    filters: queryParams,
  });

  const wallets = walletsQuery.result?.data || [];
  const isLoading = walletsQuery.query.isLoading;
  const isError = walletsQuery.query.isError;
  const error = walletsQuery.query.error;

  // 創建錢包 - 使用官方 useCreate hook
  const createMutation = useCreate<RevenueWallet>();
  const { mutate: createWallet, mutation: createMutationState } =
    createMutation;

  // 更新錢包 - 使用官方 useUpdate hook
  const updateMutation = useUpdate<RevenueWallet>();
  const { mutate: updateWallet, mutation: updateMutationState } =
    updateMutation;

  // 刪除錢包 - 使用官方 useDelete hook
  const deleteMutation = useDelete();
  const { mutate: deleteWallet } = deleteMutation;

  // 篩選後的錢包列表
  const filteredWallets = useMemo(() => {
    let filtered = wallets;

    // 名稱篩選
    if (filters.name) {
      filtered = filtered.filter((wallet) =>
        wallet.name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    // 建立時間篩選（使用 verifiedAt 作為替代）
    if (filters.createdAt) {
      const filterDate = new Date(filters.createdAt);
      filterDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((wallet) => {
        // 如果錢包有 verifiedAt，使用它；否則不篩選
        if (wallet.verifiedAt) {
          const walletDate = new Date(wallet.verifiedAt);
          walletDate.setHours(0, 0, 0, 0);
          return walletDate >= filterDate;
        }
        // 如果沒有 verifiedAt，顯示所有未驗證的錢包
        return true;
      });
    }

    return filtered;
  }, [wallets, filters]);

  // 計算活躍錢包的總比例
  const totalPercentage = useMemo(() => {
    return filteredWallets
      .filter((w) => w.isActive)
      .reduce((sum, w) => sum + w.percentage, 0);
  }, [filteredWallets]);

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

  // 處理新增錢包
  const handleAddNew = () => {
    setIsAddingMode(true);
    setEditingWalletId(null);
    setWalletForm({
      name: "",
      address: "",
      percentage: "",
      description: "",
    });
  };

  // 處理編輯錢包
  const handleEdit = (wallet: RevenueWallet) => {
    setEditingWalletId(wallet.id);
    setIsAddingMode(false);
    setWalletForm({
      id: wallet.id,
      name: wallet.name,
      address: wallet.address,
      percentage: wallet.percentage.toString(),
      description: wallet.description || "",
    });
  };

  // 處理取消編輯
  const handleCancel = () => {
    setIsAddingMode(false);
    setEditingWalletId(null);
    setWalletForm({
      name: "",
      address: "",
      percentage: "",
      description: "",
    });
  };

  // 處理提交表單
  const handleSubmit = () => {
    // 驗證必填字段
    if (!walletForm.name || !walletForm.address || !walletForm.percentage) {
      alert("請填寫所有必填字段");
      return;
    }

    const percentage = parseFloat(walletForm.percentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      alert("分配比例必須在 0-100 之間");
      return;
    }

    if (isAddingMode || !editingWalletId) {
      // 新增錢包
      createWallet(
        {
          resource: "revenue-wallets",
          values: {
            name: walletForm.name,
            address: walletForm.address,
            percentage: percentage,
            description: walletForm.description || undefined,
            isActive: true,
          },
        },
        {
          onSuccess: () => {
            handleCancel();
            walletsQuery.query.refetch();
          },
          onError: (error: any) => {
            alert(
              `創建失敗：${error?.response?.data?.message || error?.message || "未知錯誤"}`
            );
          },
        }
      );
    } else {
      // 更新錢包
      updateWallet(
        {
          resource: "revenue-wallets",
          id: editingWalletId,
          values: {
            name: walletForm.name,
            address: walletForm.address,
            percentage: percentage,
            description: walletForm.description || undefined,
          },
        },
        {
          onSuccess: () => {
            handleCancel();
            walletsQuery.query.refetch();
          },
          onError: (error: any) => {
            alert(
              `更新失敗：${error?.response?.data?.message || error?.message || "未知錯誤"}`
            );
          },
        }
      );
    }
  };

  // 處理刪除錢包
  const handleDelete = (walletId: string) => {
    if (!confirm("確定要刪除此錢包嗎？")) {
      return;
    }

    deleteWallet(
      {
        resource: "revenue-wallets",
        id: walletId,
      },
      {
        onSuccess: () => {
          walletsQuery.query.refetch();
        },
        onError: (error: any) => {
          alert(
            `刪除失敗：${error?.response?.data?.message || error?.message || "未知錯誤"}`
          );
        },
      }
    );
  };

  return (
    <ListView>
      <div className="flex items-center justify-between mb-4">
        <ListViewHeader title="錢包列表" />
        <Button onClick={handleAddNew} disabled={isLoading || isAddingMode}>
          <Plus className="w-4 h-4 mr-2" />
          修改
        </Button>
      </div>

      {/* 篩選區域 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>篩選條件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 建立時間 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">建立時間</label>
              <div className="relative">
                <Input
                  type="datetime-local"
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
      {!isLoading && (
        <>
          {isAddingMode && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>新增錢包</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">錢包名稱 *</label>
                    <Input
                      placeholder="請輸入錢包名稱"
                      value={walletForm.name}
                      onChange={(e) =>
                        setWalletForm({ ...walletForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">地址 *</label>
                    <Input
                      placeholder="請輸入錢包地址"
                      value={walletForm.address}
                      onChange={(e) =>
                        setWalletForm({
                          ...walletForm,
                          address: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">分配比例% *</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="請輸入比例"
                      value={walletForm.percentage}
                      onChange={(e) =>
                        setWalletForm({
                          ...walletForm,
                          percentage: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      onClick={handleSubmit}
                      disabled={
                        createMutationState.isPending ||
                        updateMutationState.isPending
                      }
                    >
                      {createMutationState.isPending ||
                      updateMutationState.isPending
                        ? "處理中..."
                        : "確定"}
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      取消
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {filteredWallets.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium">錢包名稱</th>
                        <th className="text-left p-4 font-medium">地址</th>
                        <th className="text-left p-4 font-medium">分配比例%</th>
                        <th className="text-left p-4 font-medium">建立時間</th>
                        <th className="text-left p-4 font-medium">狀態</th>
                        <th className="text-left p-4 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWallets.map((wallet) => {
                        const isEditing = editingWalletId === wallet.id;
                        return (
                          <tr
                            key={wallet.id}
                            className="border-b hover:bg-muted/50"
                          >
                            {isEditing ? (
                              <>
                                <td className="p-4">
                                  <Input
                                    placeholder="錢包名稱"
                                    value={walletForm.name}
                                    onChange={(e) =>
                                      setWalletForm({
                                        ...walletForm,
                                        name: e.target.value,
                                      })
                                    }
                                  />
                                </td>
                                <td className="p-4">
                                  <Input
                                    placeholder="地址"
                                    value={walletForm.address}
                                    onChange={(e) =>
                                      setWalletForm({
                                        ...walletForm,
                                        address: e.target.value,
                                      })
                                    }
                                  />
                                </td>
                                <td className="p-4">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="比例%"
                                    value={walletForm.percentage}
                                    onChange={(e) =>
                                      setWalletForm({
                                        ...walletForm,
                                        percentage: e.target.value,
                                      })
                                    }
                                  />
                                </td>
                                <td className="p-4">
                                  {wallet.verifiedAt
                                    ? formatDateTime(wallet.verifiedAt)
                                    : "-"}
                                </td>
                                <td className="p-4">
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      wallet.isActive
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {wallet.isActive ? "啟用" : "停用"}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={handleSubmit}
                                      disabled={
                                        createMutationState.isPending ||
                                        updateMutationState.isPending
                                      }
                                    >
                                      確定
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCancel}
                                    >
                                      取消
                                    </Button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-4">{wallet.name}</td>
                                <td className="p-4 font-mono text-sm">
                                  {wallet.address}
                                </td>
                                <td className="p-4">{wallet.percentage} %</td>
                                <td className="p-4">
                                  {wallet.verifiedAt
                                    ? formatDateTime(wallet.verifiedAt)
                                    : "-"}
                                </td>
                                <td className="p-4">
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      wallet.isActive
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {wallet.isActive ? "啟用" : "停用"}
                                  </span>
                                  {wallet.verified && (
                                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      已驗證
                                    </span>
                                  )}
                                </td>
                                <td className="p-4">
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEdit(wallet)}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDelete(wallet.id)}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                暫無錢包數據
              </CardContent>
            </Card>
          )}

          {/* 總比例顯示 */}
          {filteredWallets.length > 0 && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">啟用錢包總比例：</span>
                  <span
                    className={`text-lg font-bold ${
                      totalPercentage === 100
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {totalPercentage.toFixed(2)}%
                  </span>
                  {totalPercentage !== 100 && (
                    <span className="text-sm text-destructive">
                      * 啟用錢包的分配比例總和必須為 100%
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </ListView>
  );
}
