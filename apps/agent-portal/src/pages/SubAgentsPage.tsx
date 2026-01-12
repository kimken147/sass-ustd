import { useState, useMemo } from "react";
import { useCustom, useNavigation } from "@refinedev/core";
import { ListView, ListViewHeader } from "@saas-platform/ui";
import { Button } from "@saas-platform/ui";
import { Input } from "@saas-platform/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@saas-platform/ui";
import {
  Calendar,
  Search,
  Copy,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
} from "lucide-react";
import { formatDateTime, getTodayStartLocal } from "@saas-platform/utils";

// Agent 類型定義
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

// 樹狀節點類型
interface TreeNode extends Agent {
  children: TreeNode[];
  isExpanded?: boolean;
}

export default function SubAgentsPage() {
  const { create, edit } = useNavigation();

  // 篩選狀態
  const [filters, setFilters] = useState({
    name: "",
    createdAt: getTodayStartLocal(),
  });

  // 展開/收合狀態
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // 構建查詢參數
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

  // 獲取當前代理信息（用於顯示授權合約連結）
  const { query: myAgentQuery, result: myAgentResult } = useCustom<Agent>({
    url: "/api/agents/me",
    method: "get",
  });

  // 獲取下級代理列表
  const { query: subAgentsQuery, result: subAgentsResult } =
    useCustom<Agent[]>({
      url: "/api/agents/me/subordinates",
      method: "get",
      config: {
        query: queryParams,
      },
    });

  const agents = (subAgentsResult.data as Agent[]) || [];
  const myAgent = (myAgentResult.data as Agent) || null;
  const isLoading = subAgentsQuery.isLoading || myAgentQuery.isLoading;
  const isError = subAgentsQuery.isError || myAgentQuery.isError;
  const error = subAgentsQuery.error || myAgentQuery.error;

  // 構建樹狀結構
  const treeData = useMemo(() => {
    // 先過濾建立時間
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

    // 名稱篩選
    if (filters.name) {
      filtered = filtered.filter((agent) =>
        agent.name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    // 構建樹狀結構
    const agentMap = new Map<number, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // 第一遍：創建所有節點
    filtered.forEach((agent) => {
      agentMap.set(agent.id, {
        ...agent,
        children: [],
        isExpanded: expandedIds.has(agent.id),
      });
    });

    // 第二遍：建立父子關係
    filtered.forEach((agent) => {
      const node = agentMap.get(agent.id)!;
      if (agent.parentAgentId) {
        const parent = agentMap.get(agent.parentAgentId);
        if (parent) {
          parent.children.push(node);
        } else {
          // 如果找不到父節點，可能是篩選導致的，仍然顯示為根節點
          rootNodes.push(node);
        }
      } else {
        // 沒有父節點，是根節點
        rootNodes.push(node);
      }
    });

    // 對每個節點的子節點進行排序（按建立時間）
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

  // 切換展開/收合
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

  // 處理篩選變更
  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 處理查詢
  const handleSearch = () => {
    subAgentsQuery.refetch();
  };

  // 處理新增下級代理
  const handleAddNew = () => {
    create("sub-agents");
  };

  // 處理編輯下級代理
  const handleEdit = (agent: Agent) => {
    edit("sub-agents", agent.id);
  };

  // 複製推薦連結
  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link).then(
      () => {
        alert("已複製到剪貼板");
      },
      () => {
        alert("複製失敗，請手動複製");
      }
    );
  };

  // 格式化錢包地址（顯示前後部分）
  const formatWalletAddress = (address?: string) => {
    if (!address) return "-";
    if (address.length <= 20) return address;
    const prefix = address.substring(0, 10);
    const suffix = address.substring(address.length - 6);
    return `${prefix}...${suffix}`;
  };

  // 遞迴渲染樹狀節點
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const indentWidth = depth * 24; // 每層縮排 24px

    return (
      <>
        <tr
          key={node.id}
          className="border-b hover:bg-muted/50"
          style={{
            backgroundColor: depth % 2 === 0 ? undefined : "rgba(0,0,0,0.02)",
          }}
        >
          {/* 名稱（帶展開/收合圖示） */}
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
                <span className="w-6" /> // 佔位符，保持對齊
              )}
              <span>{node.name}</span>
            </div>
          </td>

          {/* 帳號 */}
          <td className="p-4 font-mono text-sm">{node.username}</td>

          {/* 錢包 */}
          <td className="p-4 font-mono text-sm">
            {formatWalletAddress(node.wallet?.address)}
          </td>

          {/* 分配比例% */}
          <td className="p-4">{`${node.commission.selfRate}%`}</td>

          {/* 建立時間 */}
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyLink(node.referralLink)}
              >
                <Copy className="w-4 h-4 mr-1" />
                複製連結
              </Button>
            </div>
          </td>
        </tr>
        {/* 遞迴渲染子節點 */}
        {hasChildren && isExpanded && (
          <>
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </>
        )}
      </>
    );
  };

  return (
    <ListView>
      <div className="flex items-center justify-between mb-4">
        <ListViewHeader title="下級列表" />
        <Button onClick={handleAddNew}>
          <Plus className="w-4 h-4 mr-2" />
          新增下級
        </Button>
      </div>

      {/* 篩選區域 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>篩選條件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 建立時間 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">建立時間</label>
              <div className="relative">
                <Input
                  type="datetime-local"
                  placeholder="請選擇時間"
                  value={filters.createdAt}
                  onChange={(e) =>
                    handleFilterChange("createdAt", e.target.value)
                  }
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* 名稱 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">名稱</label>
              <Input
                placeholder="請輸入名稱"
                value={filters.name}
                onChange={(e) => handleFilterChange("name", e.target.value)}
              />
            </div>

            {/* 查詢按鈕 */}
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

      {/* 錯誤提示 */}
      {isError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-6">
          {error?.message || "獲取下級代理列表失敗"}
        </div>
      )}

      {/* 載入狀態 */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      )}

      {/* 下級代理列表表格 */}
      {!isLoading && (
        <>
          {treeData.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-medium">名稱</th>
                        <th className="text-left p-4 font-medium">帳號</th>
                        <th className="text-left p-4 font-medium">錢包</th>
                        <th className="text-left p-4 font-medium">
                          分配比例%
                        </th>
                        <th className="text-left p-4 font-medium">建立時間</th>
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
                暫無下級代理數據
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* 授權合約鏈接區塊 */}
      {myAgent && myAgent.referralLink && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>授權合約鏈接</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm break-all">
                {myAgent.referralLink}
              </div>
              <Button
                variant="outline"
                onClick={() => handleCopyLink(myAgent.referralLink)}
              >
                <Copy className="w-4 h-4 mr-1" />
                複製
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </ListView>
  );
}
