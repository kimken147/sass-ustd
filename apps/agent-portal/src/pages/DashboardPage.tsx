import { useState, useMemo } from "react";
import { useCustom } from "@refinedev/core";
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
import { Calendar, Search, AlertCircle } from "lucide-react";
import {
  TimeType,
  CustomerListResponse,
  CustomerItem,
  CustomerAuthorizationStatus,
} from "@saas-platform/shared-types";
import {
  formatDateTimeLocalized,
  getTodayStartLocal,
} from "@saas-platform/utils";

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
            </span>{" "}
            較上月
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  // 篩選器狀態
  const [startDate, setStartDate] = useState<string>(getTodayStartLocal());
  const [endDate, setEndDate] = useState<string>("");
  const [timeType, setTimeType] = useState<TimeType>(
    TimeType.AUTHORIZATION_TIME
  );
  const [authorizationStatus, setAuthorizationStatus] =
    useState<CustomerAuthorizationStatus>(CustomerAuthorizationStatus.ALL);
  const [address, setAddress] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 20;

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
  const { query: customerQuery, result: customerResult } = useCustom<CustomerListResponse>({
    url: "/api/customers",
    method: "get",
    config: {
      query: queryParams,
    },
  });

  const handleSearch = () => {
    customerQuery.refetch();
  };

  const customerListData = customerResult.data as CustomerListResponse | undefined;
  const isLoading = customerQuery.isLoading;
  const isError = customerQuery.isError;
  const error = customerQuery.error;

  // 授權狀態映射
  const authorizationStatusMap: Record<string, string> = {
    authorized: "授權中",
    unauthorized: "未授權",
    expired: "已失效",
  };

  // 格式化錢包地址（顯示前後部分）
  const formatWalletAddress = (address: string, notes?: string) => {
    if (!address) return "";
    if (address.length <= 20) return address;
    const prefix = address.substring(0, 10);
    const suffix = address.substring(address.length - 6);
    const displayAddress = `${prefix}...${suffix}`;
    if (notes) {
      return `${notes} ${displayAddress}`;
    }
    return displayAddress;
  };

  return (
    <ListView>
      <ListViewHeader title="總覽" />

      {/* 重要提示 */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">*請先設置收款錢包</span>
          </div>
        </CardContent>
      </Card>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title="授權客戶"
            value={customerListData.stats.authorizedClients}
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
        </div>
      )}

      {/* 會員列表表格 */}
      <Card>
        <CardHeader>
          <CardTitle>會員列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              載入中...
            </div>
          ) : customerListData && customerListData.customers.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">訂單號</th>
                      <th className="text-left py-3 px-4 font-medium">會員錢包</th>
                      <th className="text-left py-3 px-4 font-medium">授權時間</th>
                      <th className="text-left py-3 px-4 font-medium">授權狀態</th>
                      <th className="text-left py-3 px-4 font-medium">已收割</th>
                      <th className="text-left py-3 px-4 font-medium">最近收割時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerListData.customers.map((customer: CustomerItem) => (
                      <tr key={customer.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">{customer.id}</td>
                        <td className="py-3 px-4">
                          {formatWalletAddress(
                            customer.walletAddress,
                            customer.notes
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {customer.authorizationTime
                            ? formatDateTimeLocalized(customer.authorizationTime)
                            : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                              customer.authorizationStatus === "authorized"
                                ? "bg-green-100 text-green-800"
                                : customer.authorizationStatus === "expired"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {
                              authorizationStatusMap[
                                customer.authorizationStatus
                              ]
                            }
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {customer.recentHarvest?.amount
                            ? customer.recentHarvest.amount.toLocaleString(
                                "zh-TW",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )
                            : "-"}
                        </td>
                        <td className="py-3 px-4">
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

              {/* 分頁控制 */}
              {customerListData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    共 {customerListData.total} 筆，第 {page} /{" "}
                    {customerListData.totalPages} 頁
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1 || isLoading}
                    >
                      Previous
                    </Button>
                    {Array.from(
                      { length: Math.min(5, customerListData.totalPages) },
                      (_, i) => {
                        let pageNum: number;
                        if (customerListData.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (
                          page >=
                          customerListData.totalPages - 2
                        ) {
                          pageNum = customerListData.totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            disabled={isLoading}
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                    )}
                    {customerListData.totalPages > 5 && (
                      <>
                        {page < customerListData.totalPages - 2 && (
                          <span className="px-2">...</span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPage(customerListData.totalPages)
                          }
                          disabled={isLoading}
                        >
                          {customerListData.totalPages}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={
                        page >= customerListData.totalPages || isLoading
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              暫無數據
            </div>
          )}
        </CardContent>
      </Card>
    </ListView>
  );
}
