import { useState, useMemo, useEffect } from "react";
import { useList, type CrudFilter } from "@refinedev/core";
import { ListView, ListViewHeader } from "@saas-platform/ui";
import { Button } from "@saas-platform/ui";
import { Input } from "@saas-platform/ui";
import { Card, CardContent } from "@saas-platform/ui";
import { Calendar, Search } from "lucide-react";
import {
  CommissionPayoutItem,
  CommissionPayoutType,
  CommissionPayoutStatus,
} from "@saas-platform/shared-types";
import {
  formatDateTimeLocalized,
  getTodayStartLocal,
} from "@saas-platform/utils";

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

  // 使用 useList hook 获取代理分润列表（使用官方 Refine hooks）
  // 注意：resource 直接使用嵌合路径 "transactions/commission-payouts"
  const payoutQuery = useList<CommissionPayoutItem>({
    resource: "transactions/commission-payouts",
    filters,
    pagination: {
      mode: "off" as const, // 关闭 Refine 的分页，使用手动管理（因为需要保留完整的 pagination 信息）
    },
  });

  const handleSearch = () => {
    payoutQuery.query.refetch();
  };

  // 转换数据格式：useList 返回 { data: CommissionPayoutItem[], total: number }
  // 但我们需要 { items, total, page, limit, totalPages } 格式
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

  return (
    <ListView>
      <ListViewHeader title="代理分润列表" />

      {/* 筛选器区域 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4 flex-wrap">
            {/* 交易时间范围 */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">交易时间</label>
              <div className="flex items-center gap-2">
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
                <span className="text-muted-foreground">至</span>
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
          {error?.message || "获取代理分润列表失败"}
        </div>
      )}

      {/* 载入状态 */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">载入中...</div>
      )}

      {/* 分润列表表格 */}
      {!isLoading && payoutData && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left text-sm font-medium">
                      交易时间
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      会员 ID
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      会员名称
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      会员钱包
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      代理 ID
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      代理名称
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      收款钱包
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      佣金金额
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      原始金额
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      佣金比例
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      佣金率
                    </th>
                    <th className="p-4 text-left text-sm font-medium">类型</th>
                    <th className="p-4 text-left text-sm font-medium">状态</th>
                    <th className="p-4 text-left text-sm font-medium">
                      交易 Hash
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      首次分润
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payoutData.items.map((item: CommissionPayoutItem) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        {item.transactionTime
                          ? formatDateTimeLocalized(item.transactionTime)
                          : "-"}
                      </td>
                      <td className="p-4">{item.customerId}</td>
                      <td className="p-4">{item.customerName}</td>
                      <td className="p-4">
                        <div className="font-mono text-sm">
                          {item.memberWallet
                            ? `${item.memberWallet.slice(0, 8)}...${item.memberWallet.slice(-6)}`
                            : "-"}
                        </div>
                      </td>
                      <td className="p-4">{item.agentId}</td>
                      <td className="p-4">{item.agentName}</td>
                      <td className="p-4">
                        <div className="font-mono text-sm">
                          {item.recipientWallet
                            ? `${item.recipientWallet.slice(0, 8)}...${item.recipientWallet.slice(-6)}`
                            : "-"}
                        </div>
                      </td>
                      <td className="p-4">
                        {parseFloat(item.amount).toLocaleString("zh-TW", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })}
                      </td>
                      <td className="p-4">
                        {parseFloat(
                          item.originalInvestmentAmount
                        ).toLocaleString("zh-TW", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })}
                      </td>
                      <td className="p-4">{item.ratio.toFixed(2)}%</td>
                      <td className="p-4">{item.commissionRate.toFixed(2)}%</td>
                      <td className="p-4">
                        <span className="text-sm">
                          {typeMap[item.type] || item.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            statusMap[item.status]?.className ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {statusMap[item.status]?.label || item.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {item.txHash ? (
                          <div className="font-mono text-xs">
                            {`${item.txHash.slice(0, 8)}...${item.txHash.slice(-6)}`}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-4">
                        {item.isFirstPayout ? (
                          <span className="text-green-600 font-medium">是</span>
                        ) : (
                          <span className="text-muted-foreground">否</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 空状态 */}
      {!isLoading && payoutData && payoutData.items.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            暂无分润记录
          </CardContent>
        </Card>
      )}

      {/* 分页控制 */}
      {!isLoading && payoutData && payoutData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            显示第 {(page - 1) * limit + 1} -{" "}
            {Math.min(page * limit, payoutData.total)} 笔，共 {payoutData.total}{" "}
            笔
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </Button>
            {Array.from({ length: payoutData.totalPages }, (_, i) => i + 1)
              .filter((p) => {
                // 只显示当前页附近和首尾页
                if (p === 1 || p === payoutData.totalPages) return true;
                return Math.abs(p - page) <= 2;
              })
              .map((p, idx, arr) => {
                // 如果当前页和前一页之间有间隔，显示省略号
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;
                return (
                  <div key={p} className="flex items-center gap-1">
                    {showEllipsis && (
                      <span className="text-muted-foreground">...</span>
                    )}
                    <Button
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  </div>
                );
              })}
            <Button
              variant="outline"
              size="sm"
              disabled={page === payoutData.totalPages}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </ListView>
  );
}
