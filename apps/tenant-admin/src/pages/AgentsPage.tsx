import React, { useState, useMemo, useEffect } from "react";
import { useList, useDelete, useNavigation } from "@refinedev/core";
import { ListView, ListViewHeader } from "@saas-platform/ui";
import { Button } from "@saas-platform/ui";
import { Input } from "@saas-platform/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@saas-platform/ui";
import {
  Calendar,
  Search,
  Plus,
  Pencil,
  Copy,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { formatDateTime, getTodayStartLocal } from "@saas-platform/utils";

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


export default function AgentsPage() {
  // 设置页面标题
  useEffect(() => {
    document.title = "代理管理 - 租户管理后台";
  }, []);

  // 筛选状态
  const [filters, setFilters] = useState({
    name: "",
    createdAt: getTodayStartLocal(),
  });

  // 展开/收合状态
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // 导航
  const { create, edit } = useNavigation();

  // 构建查询参数
  const queryParams = useMemo(() => {
    const params: any[] = [];
    if (filters.name) {
      params.push({
        field: "name",
        operator: "contains",
        value: filters.name,
      });
    }
    return params;
  }, [filters.name]);

  // 获取代理列表
  const agentsQuery = useList<Agent>({
    resource: "agents",
    filters: queryParams,
  });

  const agents = agentsQuery.result?.data || [];
  const isLoading = agentsQuery.query.isLoading;
  const isError = agentsQuery.query.isError;
  const error = agentsQuery.query.error;

  // 删除代理
  const deleteMutation = useDelete();
  const { mutate: deleteAgent } = deleteMutation;

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
          // 如果找不到父节点，可能是筛选导致的，仍然显示为根节点
          rootNodes.push(node);
        }
      } else {
        // 没有父节点，是根节点
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
    agentsQuery.query.refetch();
  };

  // 处理新增代理
  const handleAddNew = () => {
    create("agents");
  };

  // 处理编辑代理
  const handleEdit = (agent: Agent) => {
    edit("agents", agent.id);
  };

  // 处理删除代理
  const handleDelete = (agentId: number) => {
    if (!confirm("确定要删除此代理吗？")) {
      return;
    }

    deleteAgent(
      {
        resource: "agents",
        id: agentId.toString(),
      },
      {
        onSuccess: () => {
          agentsQuery.query.refetch();
        },
        onError: (error: any) => {
          alert(
            `删除失败：${
              error?.response?.data?.message || error?.message || "未知错误"
            }`
          );
        },
      }
    );
  };

  // 复制推荐连结
  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link).then(
      () => {
        alert("已复制到剪贴板");
      },
      () => {
        alert("复制失败，请手动复制");
      }
    );
  };

  // 递归渲染树状节点
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const indentWidth = depth * 24; // 每层缩排 24px

    return (
      <React.Fragment key={node.id}>
        <tr
          className="border-b hover:bg-muted/50"
          style={{
            backgroundColor: depth % 2 === 0 ? undefined : "rgba(0,0,0,0.02)",
          }}
        >
          {/* 授权合约链接 */}
          <td className="p-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopyLink(node.referralLink)}
            >
              <Copy className="w-4 h-4 mr-1" />
              复制
            </Button>
          </td>

          {/* 名称（带展开/收合图示） */}
          <td className="p-4">
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
                <span className="w-6" /> // 占位符，保持对齐
              )}
              <span>{node.name}</span>
            </div>
          </td>

          {/* 账号 */}
          <td className="p-4 font-mono text-sm">{node.username}</td>

          {/* 代理钱包 */}
          <td className="p-4 font-mono text-sm">
            {node.wallet?.address || "-"}
          </td>

          {/* 分配比例% */}
          <td className="p-4">{`${node.commission.selfRate}%`}</td>

          {/* 建立时间 */}
          <td className="p-4 text-sm">{formatDateTime(node.createdAt)}</td>

          {/* 操作 */}
          <td className="p-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(node)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          </td>
        </tr>
        {/* 递归渲染子节点 */}
        {hasChildren && isExpanded &&
          node.children.map((child) => renderTreeNode(child, depth + 1))
        }
      </React.Fragment>
    );
  };

  return (
    <ListView>
      <div className="flex items-center justify-between mb-4">
        <ListViewHeader title="代理列表" canCreate={false} />
        <Button onClick={handleAddNew} disabled={isLoading}>
          <Plus className="w-4 h-4 mr-2" />
          新增代理
        </Button>
      </div>

      {/* 筛选区域 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 建立时间 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">建立时间</label>
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
                查詢
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {isError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-6">
          {error?.message || "获取代理列表失败"}
        </div>
      )}

      {/* 载入状态 */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">载入中...</div>
      )}

      {/* 代理列表表格 */}
      {!isLoading && (
        <>
          {treeData.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-medium">
                          授权合约链接
                        </th>
                        <th className="text-left p-4 font-medium">名称</th>
                        <th className="text-left p-4 font-medium">账号</th>
                        <th className="text-left p-4 font-medium">代理钱包</th>
                        <th className="text-left p-4 font-medium">
                          分配比例%
                        </th>
                        <th className="text-left p-4 font-medium">建立时间</th>
                        <th className="text-left p-4 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {treeData.map((node) => renderTreeNode(node, 0))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                暂无代理数据
              </CardContent>
            </Card>
          )}
        </>
      )}
    </ListView>
  );
}
