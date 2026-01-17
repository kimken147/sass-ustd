import { useState, useMemo, useEffect } from "react";
import { useList, type CrudFilter } from "@refinedev/core";
import { useNavigate } from "react-router";
import { ListView } from "@saas-platform/ui";
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
import { Search, Calendar, Plus } from "lucide-react";
import { SystemWallet, SystemWalletType } from "@saas-platform/shared-types";
import { formatDateTimeLocalized } from "@saas-platform/utils";

// 類型映射
const typeMap: Record<string, string> = {
  [SystemWalletType.CONTRACT_EXECUTION]: "授權",
  [SystemWalletType.REVENUE_DISTRIBUTION]: "收款",
};

export default function WalletsPage() {
  // 设置页面标题
  useEffect(() => {
    document.title = "钱包管理 - 平台管理后台";
  }, []);

  const navigate = useNavigate();

  // 筛选输入状态（用户输入时更新）
  const [filters, setFilters] = useState({
    name: "",
    type: "",
    status: "",
    createdAt: "",
  });

  // 已提交的筛选状态（点击查询按钮时更新）
  const [appliedFilters, setAppliedFilters] = useState({
    name: "",
    type: "",
    status: "",
    createdAt: "",
  });

  // 构建查询参数（基于已提交的筛选条件）
  const queryParams = useMemo(() => {
    const params: CrudFilter[] = [];
    if (appliedFilters.name) {
      params.push({ field: "name", operator: "contains", value: appliedFilters.name });
    }
    if (appliedFilters.type) {
      params.push({ field: "type", operator: "eq", value: appliedFilters.type });
    }
    if (appliedFilters.status) {
      params.push({ field: "status", operator: "eq", value: appliedFilters.status });
    }
    // createdAt 需要根据实际 API 格式处理，暂时不处理
    return params;
  }, [appliedFilters]);

  // 获取钱包列表
  const walletsQuery = useList<SystemWallet>({
    resource: "system-wallets",
    filters: queryParams,
  });

  const wallets = walletsQuery.result?.data || [];
  const isLoading = walletsQuery.query.isLoading;
  const isError = walletsQuery.query.isError;
  const error = walletsQuery.query.error;

  // 处理筛选变更
  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 处理查询（将输入的筛选条件提交）
  const handleSearch = () => {
    setAppliedFilters({ ...filters });
  };

  // 获取分配比例（需要从站点配置中获取，这里暂时显示 "-"）
  const getPercentage = (_wallet: SystemWallet) => {
    // TODO: 从站点配置中获取该钱包的分配比例
    // 目前暂时返回 "-"
    return "-";
  };

  // 导航到创建页面
  const handleCreateWallet = () => {
    navigate("/wallets/create");
  };

  return (
    <ListView>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">钱包列表</h2>
        <Button onClick={handleCreateWallet}>
          <Plus className="w-4 h-4 mr-2" />
          新增钱包
        </Button>
      </div>

      {/* 筛选区域 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* 建立时间 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">建立时间</label>
              <div className="relative">
                <Input
                  type="date"
                  placeholder="请选择时间"
                  value={filters.createdAt}
                  onChange={(e) =>
                    handleFilterChange("createdAt", e.target.value)
                  }
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* 名称 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">名称</label>
              <Input
                placeholder="请输入名称"
                value={filters.name}
                onChange={(e) => handleFilterChange("name", e.target.value)}
              />
            </div>

            {/* 状态 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">状态</label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  handleFilterChange("status", value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="inactive">停用</SelectItem>
                  <SelectItem value="suspended">暂停</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 类型 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">类型</label>
              <Select
                value={filters.type || "all"}
                onValueChange={(value) =>
                  handleFilterChange("type", value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value={SystemWalletType.CONTRACT_EXECUTION}>
                    授權
                  </SelectItem>
                  <SelectItem value={SystemWalletType.REVENUE_DISTRIBUTION}>
                    收款
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 查询按钮 */}
            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full"
              >
                <Search className="w-4 h-4 mr-2" />
                查询
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {isError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-6">
          {error?.message || "获取钱包列表失败"}
        </div>
      )}

      {/* 载入状态 */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">载入中...</div>
      )}

      {/* 钱包列表表格 */}
      {!isLoading && wallets.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">类型</th>
                    <th className="text-left p-4 font-medium">钱包名称</th>
                    <th className="text-left p-4 font-medium">地址</th>
                    <th className="text-left p-4 font-medium">分配比例%</th>
                    <th className="text-left p-4 font-medium">建立时间</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((wallet) => {
                    return (
                      <tr
                        key={wallet.id}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="p-4">
                          {typeMap[wallet.type] || wallet.type}
                        </td>
                        <td className="p-4">{wallet.name}</td>
                        <td className="p-4 font-mono text-sm">
                          {wallet.address}
                        </td>
                        <td className="p-4">{getPercentage(wallet)}</td>
                        <td className="p-4">
                          {formatDateTimeLocalized(wallet.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 空状态 */}
      {!isLoading && wallets.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            暂无钱包数据
          </CardContent>
        </Card>
      )}
    </ListView>
  );
}
