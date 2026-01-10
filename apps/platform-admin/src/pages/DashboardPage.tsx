import { useState, useMemo } from "react";
import { useList, type CrudFilter } from "@refinedev/core";
import {
  ListView,
  ListViewHeader,
  EditButton,
} from "@saas-platform/ui";
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
import { Calendar, Search } from "lucide-react";
import {
  TimeType,
  SiteStats,
  SystemFeeWallet,
  SiteItem,
} from "@saas-platform/shared-types";
import { getTodayStartLocal } from "@saas-platform/utils";

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

export default function DashboardPage() {
  // 篩選器狀態
  const [startTime, setStartTime] = useState<string>(getTodayStartLocal());
  const [endTime, setEndTime] = useState<string>("");
  const [timeType, setTimeType] = useState<TimeType>(TimeType.AUTHORIZATION_TIME);

  // 構建查詢參數作為 filters
  const filters = useMemo(() => {
    const crudFilters: CrudFilter[] = [];
    
    if (startTime) {
      crudFilters.push({
        field: "startTime",
        operator: "eq",
        value: new Date(startTime).toISOString(),
      });
    }
    if (endTime) {
      crudFilters.push({
        field: "endTime",
        operator: "eq",
        value: new Date(endTime).toISOString(),
      });
    }
    if (timeType) {
      crudFilters.push({
        field: "timeType",
        operator: "eq",
        value: timeType,
      });
    }

    return crudFilters;
  }, [startTime, endTime, timeType]);

  // 使用標準的 useList hook 獲取站點列表
  const sitesQuery = useList<SiteItem>({
    resource: "sites",
    pagination: {
      mode: "off" as const, // 關閉 Refine 的分頁，使用手動管理
    },
    filters,
  });

  const handleSearch = () => {
    sitesQuery.query.refetch();
  };

  // 從 result 中獲取數據
  const sites = (sitesQuery.result?.data || []) as SiteItem[];
  // 從 query 的原始數據中獲取 meta（dataProvider 返回的數據包含 meta）
  const queryData = sitesQuery.query.data as any;
  const totalStats = queryData?.meta?.totalStats as SiteStats | undefined;
  const isLoading = sitesQuery.query.isLoading;
  const isError = sitesQuery.query.isError;
  const error = sitesQuery.query.error;
  const updateTime = sites.length > 0 ? new Date().toLocaleString("zh-TW") : "";

  return (
    <ListView>
      <ListViewHeader title="站點列表" canCreate={true} resource="sites" />

      {/* 篩選器區域 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">訂單時間</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                  <Input
                    type="datetime-local"
                    placeholder="請選擇時間"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <span className="text-muted-foreground">至</span>
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                  <Input
                    type="datetime-local"
                    placeholder="請選擇時間"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
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
                  <SelectItem value={TimeType.AUTHORIZATION_TIME}>授權時間</SelectItem>
                  <SelectItem value={TimeType.HARVEST_TIME}>收割時間</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button onClick={handleSearch} disabled={isLoading}>
                <Search className="w-4 h-4 mr-2" />
                查詢
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 更新時間顯示 */}
      {updateTime && (
        <div className="text-sm text-muted-foreground">
          更新時間: {updateTime}
        </div>
      )}

      {/* 錯誤提示 */}
      {isError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          {error?.message || "獲取站點列表失敗"}
        </div>
      )}

      {/* 總體統計數據 */}
      {totalStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatsCard
            title="授權客戶"
            value={totalStats.authorizedClients}
            growth={totalStats.growthPercentage}
          />
          <StatsCard
            title="總數量"
            value={totalStats.totalQuantity}
            growth={totalStats.growthPercentage}
          />
          <StatsCard
            title="收割數量"
            value={totalStats.harvestQuantity}
            growth={totalStats.growthPercentage}
          />
          <StatsCard
            title="利潤"
            value={totalStats.profit}
            growth={totalStats.growthPercentage}
          />
          <StatsCard
            title="商戶代理"
            value={totalStats.merchantAgent}
            growth={totalStats.growthPercentage}
          />
          <StatsCard
            title="系統費用"
            value={totalStats.systemFee}
            growth={totalStats.growthPercentage}
          />
        </div>
      )}

      {/* 載入狀態 */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      )}

      {/* 站點列表 */}
      {!isLoading && sites.length > 0 && (
        <div className="space-y-6">
          {sites.map((site: SiteItem, index: number) => (
            <Card key={site.id} className={index > 0 ? "mt-6" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{site.name}</CardTitle>
                    {site.customDomain && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {site.customDomain}
                      </p>
                    )}
                  </div>
                  <EditButton
                    resource="sites"
                    recordItemId={site.id}
                    variant="outline"
                    size="sm"
                  >
                    編輯
                  </EditButton>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 站點詳細資訊 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">授權錢包</p>
                    <p className="text-sm text-muted-foreground">
                      {site.authorizationWallet.label}{" "}
                      {site.authorizationWallet.address}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">站點費率</p>
                    <p className="text-sm text-muted-foreground">
                      {site.siteRate}%({site.siteRate}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">系統費錢包</p>
                    <div className="space-y-1">
                      {site.systemFeeWallets.map(
                        (wallet: SystemFeeWallet, idx: number) => (
                          <p
                            key={idx}
                            className="text-sm text-muted-foreground"
                          >
                            {wallet.label} {wallet.address} ({wallet.percentage}
                            %)
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* 站點統計數據 */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <StatsCard
                      title="授權客戶"
                      value={site.stats.authorizedClients}
                      growth={site.stats.growthPercentage}
                    />
                    <StatsCard
                      title="總數量"
                      value={site.stats.totalQuantity}
                      growth={site.stats.growthPercentage}
                    />
                    <StatsCard
                      title="收割數量"
                      value={site.stats.harvestQuantity}
                      growth={site.stats.growthPercentage}
                    />
                    <StatsCard
                      title="利潤"
                      value={site.stats.profit}
                      growth={site.stats.growthPercentage}
                    />
                    <StatsCard
                      title="商戶代理"
                      value={site.stats.merchantAgent}
                      growth={site.stats.growthPercentage}
                    />
                    <StatsCard
                      title="系統費用"
                      value={site.stats.systemFee}
                      growth={site.stats.growthPercentage}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {sites.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              暫無站點數據
            </div>
          )}
        </div>
      )}
    </ListView>
  );
}
