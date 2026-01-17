import { useState, useMemo, useEffect } from "react";
import { useList, type CrudFilter } from "@refinedev/core";
import {
  ListView,
  ListViewHeader,
  EditButton,
} from "@saas-platform/ui";
import { Button } from "@saas-platform/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@saas-platform/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@saas-platform/ui";
import { DateTimePicker } from "@saas-platform/ui";
import { Search } from "lucide-react";
import {
  TimeType,
  SiteStats,
  SystemFeeWallet,
  SiteItem,
} from "@saas-platform/shared-types";
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
  // 设置页面标题
  useEffect(() => {
    document.title = "站点列表 - 平台管理后台";
  }, []);

  // 筛选器输入状态（用户输入时更新）
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [timeType, setTimeType] = useState<TimeType>(TimeType.AUTHORIZATION_TIME);

  // 已提交的筛选状态（点击查询按钮时更新）
  const [appliedFilters, setAppliedFilters] = useState({
    startTime: "",
    endTime: "",
    timeType: TimeType.AUTHORIZATION_TIME,
  });

  // 构建查询参数作为 filters（基于已提交的筛选条件）
  const filters = useMemo(() => {
    const crudFilters: CrudFilter[] = [];

    if (appliedFilters.startTime) {
      crudFilters.push({
        field: "startTime",
        operator: "eq",
        value: new Date(appliedFilters.startTime).toISOString(),
      });
    }
    if (appliedFilters.endTime) {
      crudFilters.push({
        field: "endTime",
        operator: "eq",
        value: new Date(appliedFilters.endTime).toISOString(),
      });
    }
    if (appliedFilters.timeType) {
      crudFilters.push({
        field: "timeType",
        operator: "eq",
        value: appliedFilters.timeType,
      });
    }

    return crudFilters;
  }, [appliedFilters]);

  // 使用标准的 useList hook 获取站点列表
  const sitesQuery = useList<SiteItem>({
    resource: "sites",
    pagination: {
      mode: "off" as const, // 关闭 Refine 的分页，使用手动管理
    },
    filters,
  });

  // 处理查询（将输入的筛选条件提交）
  const handleSearch = () => {
    setAppliedFilters({
      startTime,
      endTime,
      timeType,
    });
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
      <ListViewHeader title="站点列表" canCreate={true} resource="sites" />

      {/* 筛选器区域 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">订单时间</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <DateTimePicker
                    placeholder="开始时间"
                    value={startTime}
                    onChange={(value) => setStartTime(value)}
                  />
                </div>
                <span className="text-muted-foreground">至</span>
                <div className="flex-1">
                  <DateTimePicker
                    placeholder="结束时间"
                    value={endTime}
                    onChange={(value) => setEndTime(value)}
                  />
                </div>
              </div>
            </div>
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
                  <SelectItem value={TimeType.AUTHORIZATION_TIME}>授权时间</SelectItem>
                  <SelectItem value={TimeType.HARVEST_TIME}>提币时间</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button onClick={handleSearch} disabled={isLoading}>
                <Search className="w-4 h-4 mr-2" />
                查询
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 更新时间显示 */}
      {updateTime && (
        <div className="text-sm text-muted-foreground">
          更新时间: {updateTime}
        </div>
      )}

      {/* 错误提示 */}
      {isError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          {error?.message || "获取站点列表失败"}
        </div>
      )}

      {/* 总体统计数据 */}
      {totalStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatsCard
            title="授权客户"
            value={totalStats.authorizedClients}
            growth={totalStats.growthPercentage}
          />
          <StatsCard
            title="總數量"
            value={totalStats.totalQuantity}
            growth={totalStats.growthPercentage}
          />
          <StatsCard
            title="提币數量"
            value={totalStats.harvestQuantity}
            growth={totalStats.growthPercentage}
          />
          <StatsCard
            title="利润"
            value={totalStats.profit}
            growth={totalStats.growthPercentage}
          />
          <StatsCard
            title="商户代理"
            value={totalStats.merchantAgent}
            growth={totalStats.growthPercentage}
          />
          <StatsCard
            title="系统费用"
            value={totalStats.systemFee}
            growth={totalStats.growthPercentage}
          />
        </div>
      )}

      {/* 载入状态 */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">载入中...</div>
      )}

      {/* 站点列表 */}
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
                    编辑
                  </EditButton>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 站点详细资讯 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">授权钱包</p>
                    <p className="text-sm text-muted-foreground">
                      {site.authorizationWallet.label}{" "}
                      {site.authorizationWallet.address}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">站点费率</p>
                    <p className="text-sm text-muted-foreground">
                      {site.siteRate}%({site.siteRate}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">系统费钱包</p>
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

                {/* 站点统计数据 */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <StatsCard
                      title="授权客户"
                      value={site.stats.authorizedClients}
                      growth={site.stats.growthPercentage}
                    />
                    <StatsCard
                      title="總數量"
                      value={site.stats.totalQuantity}
                      growth={site.stats.growthPercentage}
                    />
                    <StatsCard
                      title="提币數量"
                      value={site.stats.harvestQuantity}
                      growth={site.stats.growthPercentage}
                    />
                    <StatsCard
                      title="利润"
                      value={site.stats.profit}
                      growth={site.stats.growthPercentage}
                    />
                    <StatsCard
                      title="商户代理"
                      value={site.stats.merchantAgent}
                      growth={site.stats.growthPercentage}
                    />
                    <StatsCard
                      title="系统费用"
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
              暂无站点数据
            </div>
          )}
        </div>
      )}
    </ListView>
  );
}
