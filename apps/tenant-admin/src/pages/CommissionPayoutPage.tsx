import { useState, useMemo } from "react";
import { useCustom, useApiUrl } from "@refinedev/core";
import { ListView, ListViewHeader } from "@saas-platform/ui";
import { Button } from "@saas-platform/ui";
import { Input } from "@saas-platform/ui";
import { Card, CardContent } from "@saas-platform/ui";
import { Calendar, Search } from "lucide-react";
import {
  CommissionPayoutResponse,
  CommissionPayoutItem,
  CommissionPayoutType,
  CommissionPayoutStatus,
} from "@saas-platform/shared-types";
import {
  formatDateTimeLocalized,
  getTodayStartLocal,
} from "@saas-platform/utils";

export default function CommissionPayoutPage() {
  const apiUrl = useApiUrl();

  // 篩選器狀態
  const [startDate, setStartDate] = useState<string>(getTodayStartLocal());
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // 構建查詢參數
  const queryParams = useMemo(() => {
    const params: Record<string, any> = {
      page,
      limit,
    };

    if (startDate) {
      params.startDate = new Date(startDate).toISOString();
    }
    if (endDate) {
      params.endDate = new Date(endDate).toISOString();
    }

    return params;
  }, [startDate, endDate, page, limit]);

  // 使用 useCustom hook 獲取代理分潤列表
  const { query, result } = useCustom<CommissionPayoutResponse>({
    url: `${apiUrl}/transactions/commission-payouts`,
    method: "get",
    config: {
      query: queryParams,
    },
  });

  const handleSearch = () => {
    query.refetch();
  };

  const payoutData = result.data as CommissionPayoutResponse | undefined;
  const isLoading = query.isLoading;
  const isError = query.isError;
  const error = query.error;

  // 狀態映射
  const statusMap: Record<string, { label: string; className: string }> = {
    [CommissionPayoutStatus.PENDING]: {
      label: "待處理",
      className: "bg-yellow-100 text-yellow-800",
    },
    [CommissionPayoutStatus.PROCESSING]: {
      label: "處理中",
      className: "bg-blue-100 text-blue-800",
    },
    [CommissionPayoutStatus.COMPLETED]: {
      label: "已完成",
      className: "bg-green-100 text-green-800",
    },
    [CommissionPayoutStatus.FAILED]: {
      label: "失敗",
      className: "bg-red-100 text-red-800",
    },
  };

  // 類型映射
  const typeMap: Record<string, string> = {
    [CommissionPayoutType.SELF]: "自己保留",
    [CommissionPayoutType.FROM_DOWNLINE]: "來自下級",
  };

  return (
    <ListView>
      <ListViewHeader title="代理分潤列表" />

      {/* 篩選器區域 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4 flex-wrap">
            {/* 交易時間範圍 */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">交易時間</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                  <Input
                    type="datetime-local"
                    placeholder="請選擇開始時間"
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
                    placeholder="請選擇結束時間"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
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
          {error?.message || "獲取代理分潤列表失敗"}
        </div>
      )}

      {/* 載入狀態 */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      )}

      {/* 分潤列表表格 */}
      {!isLoading && payoutData && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left text-sm font-medium">
                      交易時間
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      會員 ID
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      會員名稱
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      會員錢包
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      代理 ID
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      代理名稱
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      收款錢包
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      佣金金額
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      原始金額
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      佣金比例
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      佣金率
                    </th>
                    <th className="p-4 text-left text-sm font-medium">類型</th>
                    <th className="p-4 text-left text-sm font-medium">狀態</th>
                    <th className="p-4 text-left text-sm font-medium">
                      交易 Hash
                    </th>
                    <th className="p-4 text-left text-sm font-medium">
                      首次分潤
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payoutData.items.map((item: CommissionPayoutItem) => (
                    <tr
                      key={item.id}
                      className="border-b hover:bg-muted/50"
                    >
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
                        {parseFloat(item.originalInvestmentAmount).toLocaleString(
                          "zh-TW",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          }
                        )}
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

      {/* 空狀態 */}
      {!isLoading && payoutData && payoutData.items.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            暫無分潤記錄
          </CardContent>
        </Card>
      )}

      {/* 分頁控制 */}
      {!isLoading && payoutData && payoutData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            顯示第 {(page - 1) * limit + 1} -{" "}
            {Math.min(page * limit, payoutData.total)} 筆，共{" "}
            {payoutData.total} 筆
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              上一頁
            </Button>
            {Array.from({ length: payoutData.totalPages }, (_, i) => i + 1)
              .filter((p) => {
                // 只顯示當前頁附近和首尾頁
                if (p === 1 || p === payoutData.totalPages) return true;
                return Math.abs(p - page) <= 2;
              })
              .map((p, idx, arr) => {
                // 如果當前頁和前一頁之間有間隔，顯示省略號
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
              下一頁
            </Button>
          </div>
        </div>
      )}
    </ListView>
  );
}
