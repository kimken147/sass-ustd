import React, { useState, useMemo, useEffect } from "react";
import { useCustom, useNavigation } from "@refinedev/core";
import {
  ListView,
  ListViewHeader,
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CopyableText,
  TooltipProvider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@saas-platform/ui";
import {
  Calendar,
  Search,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
} from "lucide-react";
import { formatDateTime, getTodayStartLocal } from "@saas-platform/utils";
import { useIsMobile } from "@saas-platform/ui";

// Agent 类型定义
interface Agent {
  id: number;
  userId: number;
  username: string;
  name: string;
  code: string;
  referralLink: string;
  parentAgentId?: number;
  path: string;
  level: number;
  wallet?: {
    address: string;
    chain: string;
    verified: boolean;
    verifiedAt?: string;
    verificationTxHash?: string;
    lastPaidAt?: string;
    totalPaidAmount: number;
  };
  commission: {
    baseRate: number;
    selfRate: number;
    uplineRate: number;
    isEnabled: boolean;
  };
  allocatedRate?: number;
  status: string;
  stats: {
    totalCustomers: number;
    activeCustomers: number;
    totalSubAgents: number;
    directSubAgents: number;
    totalInvestmentVolume: number;
    thisMonthVolume: number;
    totalCommissionEarned: number;
    selfCommissionEarned: number;
    uplineCommissionPassed: number;
    pendingCommission: number;
    thisMonthCommission: number;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 树状节点类型
interface TreeNode extends Agent {
  children: TreeNode[];
  isExpanded?: boolean;
}

export default function SubAgentsPage() {
  const isMobile = useIsMobile();

  // 设置页面标题
  useEffect(() => {
    document.title = "下级代理 - 代理商后台";
  }, []);

  const { create, edit } = useNavigation();

  // 筛选状态
  const [filters, setFilters] = useState({
    name: "",
    createdAt: getTodayStartLocal(),
  });

  // 展开/收合状态
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // 构建查询参数
  const queryParams = useMemo(() => {
    const params: Record<string, any> = {};
    if (filters.name) {
      params.name = filters.name;
    }
    if (filters.createdAt) {
      params.createdAt = filters.createdAt;
    }
    return params;
  }, [filters.name, filters.createdAt]);

  // 获取当前代理信息（用于显示授权合约链接）
  const { query: myAgentQuery, result: myAgentResult } = useCustom<Agent>({
    url: "/api/agents/me",
    method: "get",
  });

  // 获取下级代理列表
  const { query: subAgentsQuery, result: subAgentsResult } = useCustom<Agent[]>(
    {
      url: "/api/agents/me/subordinates",
      method: "get",
      config: {
        query: queryParams,
      },
    }
  );

  // 从 API 响应中提取实际数据（API 返回 { success, data, timestamp } 格式）
  const myAgentData = (myAgentResult.data as any)?.data as Agent | undefined;
  const subAgentsData = (subAgentsResult.data as any)?.data as
    | Agent[]
    | undefined;

  const agents = subAgentsData || [];
  const myAgent = myAgentData || null;
  const isLoading = subAgentsQuery.isLoading || myAgentQuery.isLoading;
  const isError = subAgentsQuery.isError || myAgentQuery.isError;
  const error = subAgentsQuery.error || myAgentQuery.error;

  // 构建树状结构
  const treeData = useMemo(() => {
    // 先过滤建立时间
    let filtered = agents;
    if (filters.createdAt) {
      const filterDate = new Date(filters.createdAt);
      filterDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((agent) => {
        const agentDate = new Date(agent.createdAt);
        agentDate.setHours(0, 0, 0, 0);
        return agentDate >= filterDate;
      });
    }

    // 名称筛选
    if (filters.name) {
      filtered = filtered.filter((agent) =>
        agent.name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    // 构建树状结构
    const agentMap = new Map<number, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // 第一遍：创建所有节点
    filtered.forEach((agent) => {
      agentMap.set(agent.id, {
        ...agent,
        children: [],
        isExpanded: expandedIds.has(agent.id),
      });
    });

    // 第二遍：建立父子关系
    filtered.forEach((agent) => {
      const node = agentMap.get(agent.id)!;
      if (agent.parentAgentId) {
        const parent = agentMap.get(agent.parentAgentId);
        if (parent) {
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // 对每个节点的子节点进行排序（按建立时间）
    const sortChildren = (node: TreeNode) => {
      node.children.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      node.children.forEach(sortChildren);
    };
    rootNodes.forEach(sortChildren);

    return rootNodes;
  }, [agents, filters, expandedIds]);

  // 扁平化树状数据（用于移动端显示）
  const flattenedData = useMemo(() => {
    const result: { node: TreeNode; depth: number }[] = [];
    const flatten = (nodes: TreeNode[], depth: number) => {
      nodes.forEach((node) => {
        result.push({ node, depth });
        if (expandedIds.has(node.id) && node.children.length > 0) {
          flatten(node.children, depth + 1);
        }
      });
    };
    flatten(treeData, 0);
    return result;
  }, [treeData, expandedIds]);

  // 切换展开/收合
  const toggleExpand = (agentId: number) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(agentId)) {
        newSet.delete(agentId);
      } else {
        newSet.add(agentId);
      }
      return newSet;
    });
  };

  // 处理筛选变更
  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 处理查询
  const handleSearch = () => {
    subAgentsQuery.refetch();
  };

  // 处理新增下级代理
  const handleAddNew = () => {
    create("sub-agents");
  };

  // 处理编辑下级代理
  const handleEdit = (agent: Agent) => {
    edit("sub-agents", agent.id);
  };

  // 递归渲染树状节点（桌面端）
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const indentWidth = depth * 24;

    return (
      <React.Fragment key={node.id}>
        <TableRow
          style={{
            backgroundColor: depth % 2 === 0 ? undefined : "rgba(0,0,0,0.02)",
          }}
        >
          {/* 名称（带展开/收合图示） */}
          <TableCell>
            <div
              className="flex items-center gap-2"
              style={{ paddingLeft: `${indentWidth}px` }}
            >
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(node.id)}
                  className="p-1 hover:bg-muted rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <span className="w-6" />
              )}
              <span>{node.name}</span>
            </div>
          </TableCell>

          {/* 账号 */}
          <TableCell className="font-mono text-sm">{node.username}</TableCell>

          {/* 钱包 */}
          <TableCell>
            {node.wallet?.address ? (
              <CopyableText text={node.wallet.address} />
            ) : (
              "-"
            )}
          </TableCell>

          {/* 分配比例% */}
          <TableCell>
            {node.allocatedRate !== undefined ? `${node.allocatedRate}%` : "-"}
          </TableCell>

          {/* 建立时间 */}
          <TableCell className="text-sm">
            {formatDateTime(node.createdAt)}
          </TableCell>

          {/* 操作 */}
          <TableCell>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(node)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <CopyableText
                text={node.referralLink}
                displayText="复制链接"
                truncate={false}
                fontMono={false}
                textSize="sm"
              />
            </div>
          </TableCell>
        </TableRow>
        {/* 递归渲染子节点 */}
        {hasChildren &&
          isExpanded &&
          node.children.map((child) => renderTreeNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  // 渲染移动端卡片
  const renderMobileCard = (node: TreeNode, depth: number) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);

    return (
      <Card key={node.id} className="overflow-hidden">
        <CardContent className="p-4 space-y-3">
          {/* 名称和层级指示 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(node.id)}
                  className="p-1 hover:bg-muted rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
              <span className="font-medium">{node.name}</span>
              {depth > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  L{depth}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEdit(node)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>

          {/* 详细信息 */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">账号</span>
              <span className="font-mono">{node.username}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">钱包</span>
              {node.wallet?.address ? (
                <CopyableText text={node.wallet.address} textSize="xs" />
              ) : (
                <span>-</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">分配比例</span>
              <span>
                {node.allocatedRate !== undefined ? `${node.allocatedRate}%` : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">建立时间</span>
              <span>{formatDateTime(node.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">推荐链接</span>
              <CopyableText
                text={node.referralLink}
                displayText="复制"
                truncate={false}
                fontMono={false}
                textSize="xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <TooltipProvider>
      <ListView>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <ListViewHeader title="下级列表" canCreate={false} />
          <Button onClick={handleAddNew} disabled={isLoading} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            新增下级
          </Button>
        </div>

        {/* 筛选区域 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>筛选条件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 建立时间 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">创建时间</label>
                <div className="relative">
                  <Input
                    type="datetime-local"
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
            {error?.message || "获取下级代理列表失败"}
          </div>
        )}

        {/* 载入状态 */}
        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        )}

        {/* 下级代理列表 */}
        {!isLoading && (
          <>
            {treeData.length > 0 ? (
              isMobile ? (
                // 移动端卡片视图
                <div className="space-y-3">
                  {flattenedData.map(({ node, depth }) =>
                    renderMobileCard(node, depth)
                  )}
                </div>
              ) : (
                // 桌面端表格视图
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="whitespace-nowrap">名称</TableHead>
                            <TableHead className="whitespace-nowrap">账号</TableHead>
                            <TableHead className="whitespace-nowrap">钱包</TableHead>
                            <TableHead className="whitespace-nowrap">分配比例%</TableHead>
                            <TableHead className="whitespace-nowrap">创建时间</TableHead>
                            <TableHead className="whitespace-nowrap">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {treeData.map((node) => renderTreeNode(node, 0))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  暂无下级代理数据
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* 授权合约链接区块 */}
        {myAgent && myAgent.referralLink && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>授权合约链接</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm break-all">
                  {myAgent.referralLink}
                </div>
                <CopyableText
                  text={myAgent.referralLink}
                  displayText="复制链接"
                  truncate={false}
                  fontMono={false}
                  textSize="sm"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </ListView>
    </TooltipProvider>
  );
}
