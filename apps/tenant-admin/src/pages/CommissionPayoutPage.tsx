import { useState, useMemo, useEffect } from "react";
import { useList, type CrudFilter } from "@refinedev/core";
import { ColumnDef } from "@tanstack/react-table";
import {
  ListView,
  ListViewHeader,
  DataTable,
  Button,
  Card,
  CardContent,
  CopyableText,
  TooltipProvider,
  DateTimePicker,
} from "@saas-platform/ui";
import { Search } from "lucide-react";
import {
  CommissionPayoutItem,
  CommissionPayoutType,
  CommissionPayoutStatus,
} from "@saas-platform/shared-types";
import {
  formatDateTimeLocalized,
  getTodayStartLocal,
} from "@saas-platform/utils";

// 状态映射
const statusMap: Record<string, { label: string; className: string }> = {
  [CommissionPayoutStatus.PENDING]: {
    label: "待处理",
    className: "bg-yellow-100 text-yellow-800",
  },
  [CommissionPayoutStatus.PROCESSING]: {
    label: "处理中",
    className: "bg-blue-100 text-blue-800",
  },
  [CommissionPayoutStatus.COMPLETED]: {
    label: "已完成",
    className: "bg-green-100 text-green-800",
  },
  [CommissionPayoutStatus.FAILED]: {
    label: "失败",
    className: "bg-red-100 text-red-800",
  },
};

// 类型映射
const typeMap: Record<string, string> = {
  [CommissionPayoutType.SELF]: "自己保留",
  [CommissionPayoutType.FROM_DOWNLINE]: "来自下级",
};

// 格式化金额
const formatAmount = (amount: string | number) => {
  return parseFloat(String(amount)).toLocaleString("zh-TW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
};

// 定义表格列
const columns: ColumnDef<CommissionPayoutItem, unknown>[] = [
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
    accessorKey: "agentId",
    header: "代理 ID",
  },
  {
    accessorKey: "agentName",
    header: "代理名称",
  },
  {
    accessorKey: "recipientWallet",
    header: "收款钱包",
    cell: (info) => {
      const value = info.getValue() as string | null;
      return value ? <CopyableText text={value} /> : "-";
    },
  },
  {
    accessorKey: "amount",
    header: "佣金金额",
    cell: (info) => formatAmount(info.getValue() as string),
  },
  {
    accessorKey: "originalInvestmentAmount",
    header: "原始金额",
    cell: (info) => formatAmount(info.getValue() as string),
  },
  {
    accessorKey: "ratio",
    header: "佣金比例",
    cell: (info) => `${(info.getValue() as number).toFixed(2)}%`,
  },
  {
    accessorKey: "commissionRate",
    header: "佣金率",
    cell: (info) => `${(info.getValue() as number).toFixed(2)}%`,
  },
  {
    accessorKey: "type",
    header: "类型",
    cell: (info) => {
      const type = info.getValue() as string;
      return typeMap[type] || type;
    },
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

export default function CommissionPayoutPage() {
  // 设置页面标题
  useEffect(() => {
    document.title = "代理分润列表 - 租户管理后台";
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

  // 使用 useList hook 获取代理分润列表
  const payoutQuery = useList<CommissionPayoutItem>({
    resource: "transactions/commission-payouts",
    filters,
    pagination: {
      mode: "off" as const,
    },
  });

  const handleSearch = () => {
    payoutQuery.query.refetch();
  };

  // 转换数据格式
  const payoutData = useMemo(() => {
    const data = payoutQuery.result?.data || [];
    const total = payoutQuery.result?.total || 0;

    return {
      items: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }, [payoutQuery.result?.data, payoutQuery.result?.total, page, limit]);

  const isLoading = payoutQuery.query.isLoading;
  const isError = payoutQuery.query.isError;
  const error = payoutQuery.query.error;

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
        <ListViewHeader title="代理分润列表" />

        {/* 筛选器区域 */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* 交易时间范围 */}
              <div>
                <label className="text-sm font-medium mb-2 block">交易时间</label>
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
            {error?.message || "获取代理分润列表失败"}
          </div>
        )}

        {/* 分润列表表格 */}
        <DataTable
          columns={columns}
          data={payoutData.items}
          isLoading={isLoading}
          emptyMessage="暂无分润记录"
          paginationMode="server"
          pageCount={payoutData.totalPages}
          pageIndex={page - 1}
          pageSize={limit}
          total={payoutData.total}
          onPaginationChange={handlePaginationChange}
        />
      </ListView>
    </TooltipProvider>
  );
}
