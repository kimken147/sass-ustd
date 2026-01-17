import { useState, useMemo, useEffect } from "react";
import { useCustom } from "@refinedev/core";
import { ColumnDef } from "@tanstack/react-table";
import {
  ListView,
  ListViewHeader,
  DataTable,
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CopyableText,
  TooltipProvider,
  DateTimePicker,
} from "@saas-platform/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@saas-platform/ui";
import { Search, AlertCircle } from "lucide-react";
import {
  TimeType,
  CustomerListResponse,
  CustomerItem,
  CustomerAuthorizationStatus,
} from "@saas-platform/shared-types";
import { formatDateTimeLocalized } from "@saas-platform/utils";

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
            </span>{" "}
            较上月
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// 授权状态映射
const authorizationStatusMap: Record<string, { label: string; className: string }> = {
  authorized: { label: "授权中", className: "bg-green-100 text-green-800" },
  unauthorized: { label: "未授权", className: "bg-gray-100 text-gray-800" },
  expired: { label: "已失效", className: "bg-red-100 text-red-800" },
};

// 定义表格列
const columns: ColumnDef<CustomerItem, unknown>[] = [
  {
    accessorKey: "id",
    header: "订单号",
  },
  {
    accessorKey: "walletAddress",
    header: "会员钱包",
    cell: (info) => {
      const address = info.getValue() as string;
      const row = info.row.original;
      if (!address) return "-";
      return (
        <CopyableText
          text={address}
          displayText={row.notes ? `${row.notes} ${address.substring(0, 10)}...` : undefined}
        />
      );
    },
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
    accessorKey: "recentHarvest.amount",
    header: "已收割",
    cell: (info) => {
      const row = info.row.original;
      const amount = row.recentHarvest?.amount;
      return amount
        ? amount.toLocaleString("zh-TW", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "-";
    },
  },
  {
    accessorKey: "recentHarvest.harvestTime",
    header: "最近收割时间",
    cell: (info) => {
      const row = info.row.original;
      const harvestTime = row.recentHarvest?.harvestTime;
      return harvestTime ? formatDateTimeLocalized(harvestTime) : "-";
    },
  },
];

export default function DashboardPage() {
  // 设置页面标题
  useEffect(() => {
    document.title = "总览 - 代理商后台";
  }, []);

  // 筛选器输入状态（用户输入时更新）
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

  // 已提交的筛选状态（点击查询按钮时更新）
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: "",
    endDate: "",
    timeType: TimeType.AUTHORIZATION_TIME,
    authorizationStatus: CustomerAuthorizationStatus.ALL,
    address: "",
  });

  // 构建查询参数（基于已提交的筛选条件）
  const queryParams = useMemo(() => {
    const params: Record<string, any> = {
      page,
      limit,
      timeType: appliedFilters.timeType,
      authorizationStatus: appliedFilters.authorizationStatus,
    };

    if (appliedFilters.startDate) {
      params.startDate = new Date(appliedFilters.startDate).toISOString();
    }
    if (appliedFilters.endDate) {
      params.endDate = new Date(appliedFilters.endDate).toISOString();
    }
    if (appliedFilters.address) {
      params.address = appliedFilters.address;
    }

    return params;
  }, [appliedFilters, page, limit]);

  // 使用 useCustom hook 获取会员列表
  const { query: customerQuery, result: customerResult } =
    useCustom<CustomerListResponse>({
      url: "/api/customers",
      method: "get",
      config: {
        query: queryParams,
      },
    });

  // 处理查询（将输入的筛选条件提交）
  const handleSearch = () => {
    setPage(1); // 重置页码
    setAppliedFilters({
      startDate,
      endDate,
      timeType,
      authorizationStatus,
      address,
    });
  };

  // 从包装的响应格式中提取实际数据
  const customerData = (customerResult.data as any)?.data as CustomerListResponse | undefined;
  const isLoading = customerQuery.isLoading;
  const isError = customerQuery.isError;
  const error = customerQuery.error;

  // 转换数据格式
  const tableData = useMemo(() => {
    return {
      items: customerData?.customers || [],
      total: customerData?.total || 0,
      totalPages: customerData?.totalPages || 0,
    };
  }, [customerData]);

  // 处理分页变化
  const handlePaginationChange = (pagination: {
    pageIndex: number;
    pageSize: number;
  }) => {
    setPage(pagination.pageIndex + 1);
  };

  return (
    <TooltipProvider>
      <ListView>
        <ListViewHeader title="总览" />

        {/* 重要提示 */}
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">*请先设置收款钱包</span>
            </div>
          </CardContent>
        </Card>

        {/* 筛选器区域 */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* 时间范围 */}
              <div>
                <label className="text-sm font-medium mb-2 block">订单时间</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1">
                    <DateTimePicker
                      placeholder="开始时间"
                      value={startDate}
                      onChange={(value) => setStartDate(value)}
                    />
                  </div>
                  <span className="text-muted-foreground text-center hidden sm:block">至</span>
                  <div className="flex-1">
                    <DateTimePicker
                      placeholder="结束时间"
                      value={endDate}
                      onChange={(value) => setEndDate(value)}
                    />
                  </div>
                </div>
              </div>

              {/* 筛选选项行 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 时间类型 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">时间类型</label>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">授权状态</label>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">地址</label>
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
                    查询
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
        {customerData?.stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatsCard
              title="授权客户"
              value={customerData.stats.authorizedClients}
              growth={customerData.stats.growthPercentage}
            />
            <StatsCard
              title="收割数量"
              value={customerData.stats.harvestQuantity}
              growth={customerData.stats.growthPercentage}
            />
            <StatsCard
              title="利润"
              value={customerData.stats.profit}
              growth={customerData.stats.growthPercentage}
            />
          </div>
        )}

        {/* 会员列表表格 */}
        <Card>
          <CardHeader>
            <CardTitle>会员列表</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <DataTable
              columns={columns}
              data={tableData.items}
              isLoading={isLoading}
              emptyMessage="暂无数据"
              paginationMode="server"
              pageCount={tableData.totalPages}
              pageIndex={page - 1}
              pageSize={limit}
              total={tableData.total}
              onPaginationChange={handlePaginationChange}
            />
          </CardContent>
        </Card>
      </ListView>
    </TooltipProvider>
  );
}
