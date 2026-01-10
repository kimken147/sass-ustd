import { useState, useMemo } from "react";
import { useCustom, useApiUrl, useCustomMutation } from "@refinedev/core";
import { ListView, ListViewHeader } from "@saas-platform/ui";
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
import { Checkbox } from "@saas-platform/ui";
import { Calendar, Search } from "lucide-react";
import {
  TimeType,
  CustomerListResponse,
  CustomerItem,
  CustomerAuthorizationStatus,
} from "@saas-platform/shared-types";
import { formatDateTimeLocalized } from "@saas-platform/utils";

// 統計卡片組件
function StatsCard({
  title,
  value,
  growth,
}: {
  title: string;
  value: number;
  growth?: number;
}) {
  const formatValue = (val: number) => {
    if (val >= 1000) {
      return val.toLocaleString("zh-TW", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return val.toString();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {growth !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            <span className={growth >= 0 ? "text-green-600" : "text-red-600"}>
              {growth >= 0 ? "+" : ""}
              {growth.toFixed(1)}%
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function CustomersPage() {
  const apiUrl = useApiUrl();

  // 篩選器狀態
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [timeType, setTimeType] = useState<TimeType>(
    TimeType.AUTHORIZATION_TIME
  );
  const [authorizationStatus, setAuthorizationStatus] =
    useState<CustomerAuthorizationStatus>(CustomerAuthorizationStatus.ALL);
  const [address, setAddress] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // 選中狀態
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 構建查詢參數
  const queryParams = useMemo(() => {
    const params: Record<string, any> = {
      page,
      limit,
      timeType,
      authorizationStatus,
    };

    if (startDate) {
      params.startDate = new Date(startDate).toISOString();
    }
    if (endDate) {
      params.endDate = new Date(endDate).toISOString();
    }
    if (address) {
      params.address = address;
    }

    return params;
  }, [startDate, endDate, timeType, authorizationStatus, address, page, limit]);

  // 使用 useCustom hook 獲取會員列表
  const { query, result } = useCustom<CustomerListResponse>({
    url: `${apiUrl}/customers`,
    method: "get",
    config: {
      query: queryParams,
    },
  });

  const handleSearch = () => {
    query.refetch();
  };

  const customerListData = result.data as CustomerListResponse | undefined;
  const isLoading = query.isLoading;
  const isError = query.isError;
  const error = query.error;

  // 處理全選/取消全選
  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true && customerListData) {
      setSelectedIds(new Set(customerListData.customers.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // 處理單選
  const handleSelect = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  // 授權狀態映射
  const authorizationStatusMap: Record<string, string> = {
    authorized: "已授權",
    unauthorized: "未授權",
    expired: "已失效",
  };

  // 使用 useCustomMutation 處理收割（已選擇的會員）
  const { mutate: harvestMutate, mutation: harvestMutation } =
    useCustomMutation();

  // 處理收割（已選擇的會員）
  const handleHarvest = () => {
    if (selectedIds.size === 0) {
      alert("請先選擇要收割的會員");
      return;
    }

    if (!confirm(`確定要收割 ${selectedIds.size} 個會員嗎？`)) {
      return;
    }

    harvestMutate(
      {
        url: "/api/customers/harvest",
        method: "post",
        values: { customerIds: Array.from(selectedIds) },
      },
      {
        onSuccess: (data: any) => {
          const { successCount, failureCount } = data;
          alert(`收割完成！成功: ${successCount} 個，失敗: ${failureCount} 個`);
          // 清空選擇並刷新列表
          setSelectedIds(new Set());
          query.refetch();
        },
        onError: (error: any) => {
          alert(
            `收割失敗: ${error?.response?.data?.message || error?.message || "未知錯誤"}`
          );
        },
      }
    );
  };

  // 使用 useCustomMutation 處理一鍵收割（全部會員）
  const { mutate: harvestAllMutate, mutation: harvestAllMutation } =
    useCustomMutation();

  // 處理一鍵收割（全部會員）
  const handleHarvestAll = () => {
    if (!customerListData || customerListData.customers.length === 0) {
      alert("沒有可收割的會員");
      return;
    }

    if (
      !confirm(
        `確定要一鍵收割所有 ${customerListData.total} 個會員嗎？此操作可能需要較長時間。`
      )
    ) {
      return;
    }

    // 構建查詢字符串
    const queryString = new URLSearchParams(
      Object.entries(queryParams).reduce(
        (acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            acc[key] = String(value);
          }
          return acc;
        },
        {} as Record<string, string>
      )
    ).toString();

    harvestAllMutate(
      {
        url: `/api/customers/harvest-all${queryString ? `?${queryString}` : ""}`,
        method: "post",
        values: {},
      },
      {
        onSuccess: (data: any) => {
          const { successCount, failureCount } = data;
          alert(
            `一鍵收割完成！成功: ${successCount} 個，失敗: ${failureCount} 個`
          );
          // 刷新列表
          query.refetch();
        },
        onError: (error: any) => {
          alert(
            `一鍵收割失敗: ${error?.response?.data?.message || error?.message || "未知錯誤"}`
          );
        },
      }
    );
  };

  return (
    <ListView>
      <ListViewHeader title="會員管理" />

      {/* 篩選器區域 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4 flex-wrap">
            {/* 時間範圍 */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">訂單時間</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                  <Input
                    type="datetime-local"
                    placeholder="請選擇時間"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <span className="text-muted-foreground">至</span>
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                  <Input
                    type="datetime-local"
                    placeholder="請選擇時間"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* 時間類型 */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">時間類型</label>
              <Select
                value={timeType}
                onValueChange={(value) => setTimeType(value as TimeType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇時間類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TimeType.AUTHORIZATION_TIME}>
                    授權時間
                  </SelectItem>
                  <SelectItem value={TimeType.HARVEST_TIME}>
                    收割時間
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 授權狀態 */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">授權狀態</label>
              <Select
                value={authorizationStatus}
                onValueChange={(value) =>
                  setAuthorizationStatus(value as CustomerAuthorizationStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇授權狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CustomerAuthorizationStatus.ALL}>
                    全部
                  </SelectItem>
                  <SelectItem value={CustomerAuthorizationStatus.AUTHORIZED}>
                    已授權
                  </SelectItem>
                  <SelectItem value={CustomerAuthorizationStatus.UNAUTHORIZED}>
                    未授權
                  </SelectItem>
                  <SelectItem value={CustomerAuthorizationStatus.EXPIRED}>
                    已失效
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 地址 */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">地址</label>
              <Input
                placeholder="請輸入地址"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            {/* 查詢按鈕 */}
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} disabled={isLoading}>
                <Search className="w-4 h-4 mr-2" />
                查詢
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 錯誤提示 */}
      {isError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          {error?.message || "獲取會員列表失敗"}
        </div>
      )}

      {/* 統計數據 */}
      {customerListData?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatsCard
            title="授權客戶"
            value={customerListData.stats.authorizedClients}
            growth={customerListData.stats.growthPercentage}
          />
          <StatsCard
            title="總數量"
            value={customerListData.stats.totalQuantity}
            growth={customerListData.stats.growthPercentage}
          />
          <StatsCard
            title="收割數量"
            value={customerListData.stats.harvestQuantity}
            growth={customerListData.stats.growthPercentage}
          />
          <StatsCard
            title="利潤"
            value={customerListData.stats.profit}
            growth={customerListData.stats.growthPercentage}
          />
          <StatsCard
            title="商戶代理"
            value={customerListData.stats.merchantAgent}
            growth={customerListData.stats.growthPercentage}
          />
          <StatsCard
            title="系統費用"
            value={customerListData.stats.systemFee}
            growth={customerListData.stats.growthPercentage}
          />
        </div>
      )}

      {/* 批量操作欄 */}
      {selectedIds.size > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedIds.size} 已選
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  取消
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAll(true)}
                >
                  全選
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleHarvest}
                  disabled={harvestMutation.isPending || selectedIds.size === 0}
                >
                  {harvestMutation.isPending ? "處理中..." : "收割"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleHarvestAll}
                  disabled={
                    harvestAllMutation.isPending ||
                    !customerListData ||
                    customerListData.customers.length === 0
                  }
                >
                  {harvestAllMutation.isPending ? "處理中..." : "一鍵收割"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 載入狀態 */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      )}

      {/* 會員列表表格 */}
      {!isLoading && customerListData && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left">
                      <Checkbox
                        checked={
                          customerListData.customers.length > 0 &&
                          selectedIds.size === customerListData.customers.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-4 text-left text-sm font-medium">ID</th>
                    <th className="p-4 text-left text-sm font-medium">
                      會員錢包
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      錢包明細
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      授權時間
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      授權狀態
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      當前數量
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      最近收割數量
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      最近收割時間
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customerListData.customers.map((customer: CustomerItem) => (
                    <tr
                      key={customer.id}
                      className="border-b hover:bg-muted/50"
                    >
                      <td className="p-4">
                        <Checkbox
                          checked={selectedIds.has(customer.id)}
                          onCheckedChange={(checked) =>
                            handleSelect(customer.id, checked === true)
                          }
                        />
                      </td>
                      <td className="p-4">{customer.id}</td>
                      <td className="p-4">
                        <div>
                          {customer.notes && (
                            <div className="text-sm text-muted-foreground mb-1">
                              站長備註: {customer.notes}
                            </div>
                          )}
                          <div className="font-mono text-sm">
                            {customer.walletAddress}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Button variant="ghost" size="sm">
                          查看
                        </Button>
                      </td>
                      <td className="p-4">
                        {customer.authorizationTime
                          ? formatDateTimeLocalized(customer.authorizationTime)
                          : "-"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            customer.authorizationStatus === "authorized"
                              ? "bg-green-100 text-green-800"
                              : customer.authorizationStatus === "unauthorized"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {authorizationStatusMap[
                            customer.authorizationStatus
                          ] || customer.authorizationStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        {customer.currentAmount.toLocaleString("zh-TW", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-4">
                        {customer.recentHarvest
                          ? customer.recentHarvest.amount.toLocaleString(
                              "zh-TW",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )
                          : "-"}
                      </td>
                      <td className="p-4">
                        {customer.recentHarvest?.harvestTime
                          ? formatDateTimeLocalized(
                              customer.recentHarvest.harvestTime
                            )
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分頁控制 */}
      {!isLoading && customerListData && customerListData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            顯示第 {(page - 1) * limit + 1} -{" "}
            {Math.min(page * limit, customerListData.total)} 筆，共{" "}
            {customerListData.total} 筆
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            {Array.from(
              { length: customerListData.totalPages },
              (_, i) => i + 1
            ).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={page === customerListData.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </ListView>
  );
}
