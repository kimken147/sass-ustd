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


export default function AgentsPage() {
  // 設置頁面標題
  useEffect(() => {
    document.title = "代理管理 - 租戶管理後台";
  }, []);

  // 篩選狀態
  const [filters, setFilters] = useState({
    name: "",
    createdAt: getTodayStartLocal(),
  });

  // 展開/收合狀態
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // 導航
  const { create, edit } = useNavigation();

  // 構建查詢參數
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

  // 獲取代理列表
  const agentsQuery = useList<Agent>({
    resource: "agents",
    filters: queryParams,
  });

  const agents = agentsQuery.result?.data || [];
  const isLoading = agentsQuery.query.isLoading;
  const isError = agentsQuery.query.isError;
  const error = agentsQuery.query.error;

  // 刪除代理
  const deleteMutation = useDelete();
  const { mutate: deleteAgent } = deleteMutation;

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
    agentsQuery.query.refetch();
  };

  // 處理新增代理
  const handleAddNew = () => {
    create("agents");
  };

  // 處理編輯代理
  const handleEdit = (agent: Agent) => {
    edit("agents", agent.id);
  };

  // 處理刪除代理
  const handleDelete = (agentId: number) => {
    if (!confirm("確定要刪除此代理嗎？")) {
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
            `刪除失敗：${
              error?.response?.data?.message || error?.message || "未知錯誤"
            }`
          );
        },
      }
    );
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

  // 遞迴渲染樹狀節點
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const indentWidth = depth * 24; // 每層縮排 24px

    return (
      <React.Fragment key={node.id}>
        <tr
          className="border-b hover:bg-muted/50"
          style={{
            backgroundColor: depth % 2 === 0 ? undefined : "rgba(0,0,0,0.02)",
          }}
        >
          {/* 授權合約鏈接 */}
          <td className="p-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopyLink(node.referralLink)}
            >
              <Copy className="w-4 h-4 mr-1" />
              複製
            </Button>
          </td>

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

          {/* 代理錢包 */}
          <td className="p-4 font-mono text-sm">
            {node.wallet?.address || "-"}
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
            </div>
          </td>
        </tr>
        {/* 遞迴渲染子節點 */}
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
          {error?.message || "獲取代理列表失敗"}
        </div>
      )}

      {/* 載入狀態 */}
      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
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
                          授權合約鏈接
                        </th>
                        <th className="text-left p-4 font-medium">名稱</th>
                        <th className="text-left p-4 font-medium">帳號</th>
                        <th className="text-left p-4 font-medium">代理錢包</th>
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
                暫無代理數據
              </CardContent>
            </Card>
          )}
        </>
      )}
    </ListView>
  );
}
