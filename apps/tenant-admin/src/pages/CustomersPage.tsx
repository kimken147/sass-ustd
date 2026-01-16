import { useState, useMemo, useEffect } from "react";
import { useCustom, useCustomMutation, useApiUrl } from "@refinedev/core";
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
import {
  formatDateTimeLocalized,
  getTodayStartLocal,
} from "@saas-platform/utils";

// 统计卡片组件
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
  // 设置页面标题
  useEffect(() => {
    document.title = "会员管理 - 租户管理后台";
  }, []);

  // 筛选器状态
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

  // 选中状态
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const apiUrl = useApiUrl();

  // 构建查询参数
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

  // 使用 useCustom hook 获取会员列表
  // 注意：CustomerListResponse 是特殊格式（包含 customers, stats, total 等），
  // 不符合标准的 { data: Array, total: number } 格式，所以需要使用 useCustom
  const { query, result } = useCustom<CustomerListResponse>({
    url: `${apiUrl}/api/customers`,
    method: "get",
    config: {
      query: queryParams,
    },
  });

  const handleSearch = () => {
    query.refetch();
  };

  // 从包装的响应格式中提取实际数据
  // TransformInterceptor 将数据包装为 { success, data, timestamp }
  const customerListData = (result.data as any)?.data as CustomerListResponse | undefined;
  const isLoading = query.isLoading;
  const isError = query.isError;
  const error = query.error;

  // 处理全选/取消全选
  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true && customerListData?.customers) {
      setSelectedIds(new Set(customerListData.customers.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // 处理单选
  const handleSelect = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  // 授权状态映射
  const authorizationStatusMap: Record<string, string> = {
    authorized: "已授权",
    unauthorized: "未授权",
    expired: "已失效",
  };

  // 使用 useCustomMutation 处理收割（已选择的会员）
  const { mutate: harvestMutate, mutation: harvestMutation } =
    useCustomMutation();

  // 处理收割（已选择的会员）
  const handleHarvest = () => {
    if (selectedIds.size === 0) {
      alert("请先选择要收割的会员");
      return;
    }

    if (!confirm(`确定要收割 ${selectedIds.size} 个会员吗？`)) {
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
          alert(`收割完成！成功: ${successCount} 个，失败: ${failureCount} 个`);
          // 清空选择并刷新列表
          setSelectedIds(new Set());
          query.refetch();
        },
        onError: (error: any) => {
          alert(
            `收割失败: ${error?.response?.data?.message || error?.message || "未知错误"}`
          );
        },
      }
    );
  };

  // 使用 useCustomMutation 处理一键收割（全部会员）
  const { mutate: harvestAllMutate, mutation: harvestAllMutation } =
    useCustomMutation();

  // 处理一键收割（全部会员）
  const handleHarvestAll = () => {
    if (!customerListData || !customerListData.customers || customerListData.customers.length === 0) {
      alert("没有可收割的会员");
      return;
    }

    if (
      !confirm(
        `确定要一键收割所有 ${customerListData.total} 个会员吗？此操作可能需要较长时间。`
      )
    ) {
      return;
    }

    // 构建查询字符串
    const queryParamsObj: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString(),
      timeType,
      authorizationStatus,
    };

    if (startDate) {
      queryParamsObj.startDate = new Date(startDate).toISOString();
    }
    if (endDate) {
      queryParamsObj.endDate = new Date(endDate).toISOString();
    }
    if (address) {
      queryParamsObj.address = address;
    }

    const queryString = new URLSearchParams(
      Object.entries(queryParamsObj).reduce(
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
            `一键收割完成！成功: ${successCount} 个，失败: ${failureCount} 个`
          );
          // 刷新列表
          query.refetch();
        },
        onError: (error: any) => {
          alert(
            `一键收割失败: ${error?.response?.data?.message || error?.message || "未知错误"}`
          );
        },
      }
    );
  };

  return (
    <ListView>
      <ListViewHeader title="会员管理" />

      {/* 筛选器区域 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4 flex-wrap">
            {/* 时间范围 */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">订单时间</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                  <Input
                    type="datetime-local"
                    placeholder="请选择时间"
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
                    placeholder="请选择时间"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* 时间类型 */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">时间类型</label>
              <Select
                value={timeType}
                onValueChange={(value) => setTimeType(value as TimeType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择时间类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TimeType.AUTHORIZATION_TIME}>
                    授权时间
                  </SelectItem>
                  <SelectItem value={TimeType.HARVEST_TIME}>
                    收割时间
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 授权状态 */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">授权状态</label>
              <Select
                value={authorizationStatus}
                onValueChange={(value) =>
                  setAuthorizationStatus(value as CustomerAuthorizationStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择授权状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CustomerAuthorizationStatus.ALL}>
                    全部
                  </SelectItem>
                  <SelectItem value={CustomerAuthorizationStatus.AUTHORIZED}>
                    已授权
                  </SelectItem>
                  <SelectItem value={CustomerAuthorizationStatus.UNAUTHORIZED}>
                    未授权
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
                placeholder="请输入地址"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            {/* 查询按钮 */}
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} disabled={isLoading}>
                <Search className="w-4 h-4 mr-2" />
                查詢
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {isError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          {error?.message || "获取会员列表失败"}
        </div>
      )}

      {/* 统计数据 */}
      {customerListData?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatsCard
            title="授权客户"
            value={customerListData.stats.authorizedClients}
            growth={customerListData.stats.growthPercentage}
          />
          <StatsCard
            title="总数量"
            value={customerListData.stats.totalQuantity}
            growth={customerListData.stats.growthPercentage}
          />
          <StatsCard
            title="收割数量"
            value={customerListData.stats.harvestQuantity}
            growth={customerListData.stats.growthPercentage}
          />
          <StatsCard
            title="利润"
            value={customerListData.stats.profit}
            growth={customerListData.stats.growthPercentage}
          />
          <StatsCard
            title="商户代理"
            value={customerListData.stats.merchantAgent}
            growth={customerListData.stats.growthPercentage}
          />
          <StatsCard
            title="系统费用"
            value={customerListData.stats.systemFee}
            growth={customerListData.stats.growthPercentage}
          />
        </div>
      )}

      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedIds.size} 已选
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
                  全选
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleHarvest}
                  disabled={harvestMutation.isPending || selectedIds.size === 0}
                >
                  {harvestMutation.isPending ? "处理中..." : "收割"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleHarvestAll}
                  disabled={
                    harvestAllMutation.isPending ||
                    !customerListData ||
                    !customerListData.customers ||
                    customerListData.customers.length === 0
                  }
                >
                  {harvestAllMutation.isPending ? "处理中..." : "一键收割"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 载入状态 */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">载入中...</div>
      )}

      {/* 会员列表表格 */}
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
                          (customerListData.customers?.length ?? 0) > 0 &&
                          selectedIds.size === (customerListData.customers?.length ?? 0)
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-4 text-left text-sm font-medium">ID</th>
                    <th className="p-4 text-left text-sm font-medium">
                      会员钱包
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      钱包明细
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      授权时间
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      授权状态
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      当前数量
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      最近收割数量
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      最近收割时间
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customerListData.customers?.map((customer: CustomerItem) => (
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
                              站长备注: {customer.notes}
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

      {/* 分页控制 */}
      {!isLoading && customerListData && customerListData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            显示第 {(page - 1) * limit + 1} -{" "}
            {Math.min(page * limit, customerListData.total)} 笔，共{" "}
            {customerListData.total} 笔
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
