import { useState, useMemo, useEffect } from "react";
import { useList, type CrudFilter } from "@refinedev/core";
import { ColumnDef } from "@tanstack/react-table";
import {
  ListView,
  ListViewHeader,
  DataTable,
  Button,
  Input,
  Card,
  CardContent,
  CopyableText,
  TooltipProvider,
} from "@saas-platform/ui";
import { Calendar, Search } from "lucide-react";
import { RevenueDistributionItem } from "@saas-platform/shared-types";
import {
  formatDateTimeLocalized,
  getTodayStartLocal,
} from "@saas-platform/utils";

// 状态映射
const statusMap: Record<string, { label: string; className: string }> = {
  pending: { label: "待处理", className: "bg-yellow-100 text-yellow-800" },
  processing: {
    label: "处理中",
    className: "bg-blue-100 text-blue-800",
  },
  completed: { label: "已完成", className: "bg-green-100 text-green-800" },
  failed: { label: "失败", className: "bg-red-100 text-red-800" },
};

// 格式化金额
const formatAmount = (amount: string | number) => {
  return parseFloat(String(amount)).toLocaleString("zh-TW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
};

// 定义表格列
const columns: ColumnDef<RevenueDistributionItem, unknown>[] = [
  {
    accessorKey: "transactionTime",
    header: "交易时间",
    cell: (info) => {
      const value = info.getValue() as string | null;
      return value ? formatDateTimeLocalized(value) : "-";
    },
  },
  {
    accessorKey: "customerId",
    header: "会员 ID",
  },
  {
    accessorKey: "customerName",
    header: "会员名称",
  },
  {
    accessorKey: "memberWallet",
    header: "会员钱包",
    cell: (info) => {
      const value = info.getValue() as string | null;
      return value ? <CopyableText text={value} /> : "-";
    },
  },
  {
    accessorKey: "recipient",
    header: "收款钱包",
  },
  {
    accessorKey: "recipientWallet",
    header: "收款地址",
    cell: (info) => {
      const value = info.getValue() as string | null;
      return value ? <CopyableText text={value} /> : "-";
    },
  },
  {
    accessorKey: "amount",
    header: "分配金额",
    cell: (info) => formatAmount(info.getValue() as string),
  },
  {
    accessorKey: "originalAmount",
    header: "原始金额",
    cell: (info) => formatAmount(info.getValue() as string),
  },
  {
    accessorKey: "ratio",
    header: "分配比例",
    cell: (info) => `${(info.getValue() as number).toFixed(2)}%`,
  },
  {
    accessorKey: "revenueRate",
    header: "收入比例",
    cell: (info) => `${(info.getValue() as number).toFixed(2)}%`,
  },
  {
    accessorKey: "status",
    header: "状态",
    cell: (info) => {
      const status = info.getValue() as string;
      const statusInfo = statusMap[status] || {
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
    accessorKey: "txHash",
    header: "交易 Hash",
    cell: (info) => {
      const value = info.getValue() as string | null;
      return value ? <CopyableText text={value} textSize="xs" /> : "-";
    },
  },
  {
    accessorKey: "isFirstPayout",
    header: "首次分润",
    cell: (info) => {
      const isFirst = info.getValue() as boolean;
      return isFirst ? (
        <span className="text-green-600 font-medium">是</span>
      ) : (
        <span className="text-muted-foreground">否</span>
      );
    },
  },
];

export default function RevenueDistributionPage() {
  // 设置页面标题
  useEffect(() => {
    document.title = "站长收益列表 - 租户管理后台";
  }, []);

  // 筛选器状态
  const [startDate, setStartDate] = useState<string>(getTodayStartLocal());
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // 构建 Refine 筛选参数
  const filters = useMemo(() => {
    const filterArray: CrudFilter[] = [];

    if (startDate) {
      filterArray.push({
        field: "startDate",
        operator: "eq",
        value: new Date(startDate).toISOString(),
      });
    }
    if (endDate) {
      filterArray.push({
        field: "endDate",
        operator: "eq",
        value: new Date(endDate).toISOString(),
      });
    }
    if (page) {
      filterArray.push({
        field: "page",
        operator: "eq",
        value: page,
      });
    }
    if (limit) {
      filterArray.push({
        field: "limit",
        operator: "eq",
        value: limit,
      });
    }

    return filterArray;
  }, [startDate, endDate, page, limit]);

  // 使用 useList hook 获取站长收益列表（使用官方 Refine hooks）
  // 注意：resource 直接使用嵌合路径 "transactions/revenue-distributions"
  const revenueQuery = useList<RevenueDistributionItem>({
    resource: "transactions/revenue-distributions",
    filters,
    pagination: {
      mode: "off" as const, // 关闭 Refine 的分页，使用手动管理（因为需要保留完整的 pagination 信息）
    },
  });

  const handleSearch = () => {
    revenueQuery.query.refetch();
  };

  // 转换数据格式：useList 返回 { data: RevenueDistributionItem[], total: number }
  // 但我们需要 { items, total, page, limit, totalPages } 格式
  const revenueData = useMemo(() => {
    const data = revenueQuery.result?.data || [];
    const total = revenueQuery.result?.total || 0;

    return {
      items: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }, [revenueQuery.result?.data, revenueQuery.result?.total, page, limit]);

  const isLoading = revenueQuery.query.isLoading;
  const isError = revenueQuery.query.isError;
  const error = revenueQuery.query.error;

  // 处理分页变化
  const handlePaginationChange = (pagination: {
    pageIndex: number;
    pageSize: number;
  }) => {
    setPage(pagination.pageIndex + 1); // DataTable 使用 0-indexed，API 使用 1-indexed
  };

  return (
    <TooltipProvider>
      <ListView>
        <ListViewHeader title="站长收益列表" />

        {/* 筛选器区域 */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* 交易时间范围 */}
              <div>
                <label className="text-sm font-medium mb-2 block">交易时间</label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                    <Input
                      type="datetime-local"
                      placeholder="请选择开始时间"
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
                      placeholder="请选择结束时间"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* 查询按钮 */}
              <Button onClick={handleSearch} disabled={isLoading} className="w-full sm:w-auto">
                <Search className="w-4 h-4 mr-2" />
                查詢
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 错误提示 */}
        {isError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
            {error?.message || "获取站长收益列表失败"}
          </div>
        )}

        {/* 收益列表表格 */}
        <DataTable
          columns={columns}
          data={revenueData.items}
          isLoading={isLoading}
          emptyMessage="暂无收益记录"
          paginationMode="server"
          pageCount={revenueData.totalPages}
          pageIndex={page - 1}
          pageSize={limit}
          total={revenueData.total}
          onPaginationChange={handlePaginationChange}
        />
      </ListView>
    </TooltipProvider>
  );
}
