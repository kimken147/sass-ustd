import { useState, useMemo, useEffect } from "react";
import { useCustom, useCustomMutation, useApiUrl, useNotification } from "@refinedev/core";
import { ColumnDef } from "@tanstack/react-table";
import {
  ListView,
  ListViewHeader,
  DataTable,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  CopyableText,
  TooltipProvider,
} from "@saas-platform/ui";
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

// 授权状态映射
const authorizationStatusMap: Record<string, { label: string; className: string }> = {
  authorized: { label: "已授权", className: "bg-green-100 text-green-800" },
  unauthorized: { label: "未授权", className: "bg-gray-100 text-gray-800" },
  expired: { label: "已失效", className: "bg-red-100 text-red-800" },
};

// 格式化金额
const formatAmount = (amount: number) => {
  return amount.toLocaleString("zh-TW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function CustomersPage() {
  // 设置页面标题
  useEffect(() => {
    document.title = "会员管理 - 租户管理后台";
  }, []);

  const { open } = useNotification();

  // 筛选器状态
  const [startDate, setStartDate] = useState<string>(getTodayStartLocal());
  const [endDate, setEndDate] = useState<string>("");
  const [timeType, setTimeType] = useState<TimeType>(TimeType.AUTHORIZATION_TIME);
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

  // 使用 useCustomMutation 处理收割（已选择的会员）
  const { mutate: harvestMutate, mutation: harvestMutation } = useCustomMutation();

  // 处理收割（已选择的会员）
  const handleHarvest = () => {
    if (selectedIds.size === 0) {
      open?.({
        type: "error",
        message: "操作失败",
        description: "请先选择要收割的会员",
      });
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
        errorNotification: false,
        successNotification: false,
      },
      {
        onSuccess: (data: any) => {
          const { successCount, failureCount } = data;
          open?.({
            type: "success",
            message: "收割完成",
            description: `成功: ${successCount} 个，失败: ${failureCount} 个`,
          });
          setSelectedIds(new Set());
          query.refetch();
        },
        onError: (error: any) => {
          open?.({
            type: "error",
            message: "收割失败",
            description:
              error?.response?.data?.message || error?.message || "未知错误",
          });
        },
      }
    );
  };

  // 使用 useCustomMutation 处理一键收割（全部会员）
  const { mutate: harvestAllMutate, mutation: harvestAllMutation } = useCustomMutation();

  // 处理一键收割（全部会员）
  const handleHarvestAll = () => {
    if (!customerListData?.customers?.length) {
      open?.({
        type: "error",
        message: "操作失败",
        description: "没有可收割的会员",
      });
      return;
    }

    if (!confirm(`确定要一键收割所有 ${customerListData.total} 个会员吗？此操作可能需要较长时间。`)) {
      return;
    }

    const queryParamsObj: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString(),
      timeType,
      authorizationStatus,
    };

    if (startDate) queryParamsObj.startDate = new Date(startDate).toISOString();
    if (endDate) queryParamsObj.endDate = new Date(endDate).toISOString();
    if (address) queryParamsObj.address = address;

    const queryString = new URLSearchParams(queryParamsObj).toString();

    harvestAllMutate(
      {
        url: `/api/customers/harvest-all${queryString ? `?${queryString}` : ""}`,
        method: "post",
        values: {},
        errorNotification: false,
        successNotification: false,
      },
      {
        onSuccess: (data: any) => {
          const { successCount, failureCount } = data;
          open?.({
            type: "success",
            message: "一键收割完成",
            description: `成功: ${successCount} 个，失败: ${failureCount} 个`,
          });
          query.refetch();
        },
        onError: (error: any) => {
          open?.({
            type: "error",
            message: "一键收割失败",
            description:
              error?.response?.data?.message || error?.message || "未知错误",
          });
        },
      }
    );
  };

  // 处理分页变化
  const handlePaginationChange = (pagination: { pageIndex: number; pageSize: number }) => {
    setPage(pagination.pageIndex + 1);
  };

  // 定义表格列
  const columns: ColumnDef<CustomerItem, unknown>[] = useMemo(
    () => [
      {
        id: "select",
        header: () => (
          <Checkbox
            checked={
              (customerListData?.customers?.length ?? 0) > 0 &&
              selectedIds.size === (customerListData?.customers?.length ?? 0)
            }
            onCheckedChange={handleSelectAll}
          />
        ),
        cell: (info) => (
          <Checkbox
            checked={selectedIds.has(info.row.original.id)}
            onCheckedChange={(checked) =>
              handleSelect(info.row.original.id, checked === true)
            }
          />
        ),
      },
      {
        accessorKey: "id",
        header: "ID",
      },
      {
        accessorKey: "walletAddress",
        header: "会员钱包",
        cell: (info) => {
          const customer = info.row.original;
          return (
            <div className="space-y-1">
              {customer.notes && (
                <div className="text-xs text-muted-foreground">
                  站长备注: {customer.notes}
                </div>
              )}
              <CopyableText text={customer.walletAddress} />
            </div>
          );
        },
      },
      {
        id: "walletDetail",
        header: "钱包明细",
        cell: () => (
          <Button variant="ghost" size="sm">
            查看
          </Button>
        ),
      },
      {
        accessorKey: "authorizationTime",
        header: "授权时间",
        cell: (info) => {
          const value = info.getValue() as string | null;
          return value ? formatDateTimeLocalized(value) : "-";
        },
      },
      {
        accessorKey: "authorizationStatus",
        header: "授权状态",
        cell: (info) => {
          const status = info.getValue() as string;
          const statusInfo = authorizationStatusMap[status] || {
            label: status,
            className: "bg-gray-100 text-gray-800",
          };
          return (
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}
            >
              {statusInfo.label}
            </span>
          );
        },
      },
      {
        accessorKey: "currentAmount",
        header: "当前数量",
        cell: (info) => formatAmount(info.getValue() as number),
      },
      {
        id: "recentHarvestAmount",
        header: "最近收割数量",
        cell: (info) => {
          const harvest = info.row.original.recentHarvest;
          return harvest ? formatAmount(harvest.amount) : "-";
        },
      },
      {
        id: "recentHarvestTime",
        header: "最近收割时间",
        cell: (info) => {
          const harvest = info.row.original.recentHarvest;
          return harvest?.harvestTime
            ? formatDateTimeLocalized(harvest.harvestTime)
            : "-";
        },
      },
    ],
    [customerListData?.customers?.length, selectedIds]
  );

  const customers = customerListData?.customers || [];
  const totalPages = customerListData?.totalPages || 1;
  const total = customerListData?.total || 0;

  return (
    <TooltipProvider>
      <ListView>
        <ListViewHeader title="会员管理" />

        {/* 筛选器区域 */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* 时间范围 */}
              <div>
                <label className="text-sm font-medium mb-2 block">订单时间</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
                  <span className="text-muted-foreground text-center hidden sm:block">至</span>
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

              {/* 筛选条件行 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 时间类型 */}
                <div>
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
                <div>
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
                      <SelectItem value={CustomerAuthorizationStatus.ALL}>全部</SelectItem>
                      <SelectItem value={CustomerAuthorizationStatus.AUTHORIZED}>已授权</SelectItem>
                      <SelectItem value={CustomerAuthorizationStatus.UNAUTHORIZED}>未授权</SelectItem>
                      <SelectItem value={CustomerAuthorizationStatus.EXPIRED}>已失效</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 地址 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">地址</label>
                  <Input
                    placeholder="请输入地址"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                {/* 查询按钮 */}
                <div className="flex items-end">
                  <Button onClick={handleSearch} disabled={isLoading} className="w-full">
                    <Search className="w-4 h-4 mr-2" />
                    查詢
                  </Button>
                </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">{selectedIds.size} 已选</span>
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
                    disabled={harvestAllMutation.isPending || !customers.length}
                  >
                    {harvestAllMutation.isPending ? "处理中..." : "一键收割"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 会员列表表格 */}
        <DataTable
          columns={columns}
          data={customers}
          isLoading={isLoading}
          emptyMessage="暂无会员数据"
          paginationMode="server"
          pageCount={totalPages}
          pageIndex={page - 1}
          pageSize={limit}
          total={total}
          onPaginationChange={handlePaginationChange}
        />
      </ListView>
    </TooltipProvider>
  );
}
