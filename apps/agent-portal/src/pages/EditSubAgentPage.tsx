import { useState, useEffect } from "react";
import { useNavigation, useCustom, useNotification } from "@refinedev/core";
import {
  CreateView,
  CreateViewHeader,
  Button,
  Input,
  Label,
  Card,
  CardContent,
} from "@saas-platform/ui";
import { useParams } from "react-router";
import { getTenantApiClient } from "@saas-platform/api-client";

interface Agent {
  id: number;
  userId: number;
  username: string;
  name: string;
  allocatedRate?: number;
  wallet?: {
    address: string;
  };
  notes?: string;
}

interface EditSubAgentFormData {
  name: string;
  allocatedRate: string;
  walletAddress: string;
  notes?: string;
}

export default function EditSubAgentPage() {
  // 设置页面标题
  useEffect(() => {
    document.title = "编辑下级代理 - 代理商后台";
  }, []);

  const { id } = useParams<{ id: string }>();
  const { list } = useNavigation();
  const { open } = useNotification();
  const [isUpdating, setIsUpdating] = useState(false);

  // 获取下级代理列表，找到要编辑的代理
  const { query: subAgentsQuery, result: subAgentsResult } =
    useCustom<Agent[]>({
      url: "/api/agents/me/subordinates",
      method: "get",
    });

  // 从 API 响应中提取实际数据（API 返回 { success, data, timestamp } 格式）
  const subAgentsData = (subAgentsResult.data as any)?.data as Agent[] | undefined;
  const subAgents = subAgentsData || [];
  const agent = subAgents.find((a) => a.id === parseInt(id || "0"));

  // 表单状态
  const [formData, setFormData] = useState<EditSubAgentFormData>({
    name: "",
    allocatedRate: "",
    walletAddress: "",
    notes: "",
  });

  // 当代理数据加载完成时，初始化表单
  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        allocatedRate: agent.allocatedRate?.toString() || "",
        walletAddress: agent.wallet?.address || "",
        notes: agent.notes || "",
      });
    }
  }, [agent]);

  // 处理表单输入变更
  const handleInputChange = (
    field: keyof EditSubAgentFormData,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id || !agent) {
      open?.({
        type: "error",
        message: "错误",
        description: "下级代理不存在",
      });
      return;
    }

    // 验证必填字段
    if (!formData.name || !formData.walletAddress) {
      open?.({
        type: "error",
        message: "验证失败",
        description: "请填写所有必填字段",
      });
      return;
    }

    const updateData: any = {
      name: formData.name,
      walletAddress: formData.walletAddress,
      notes: formData.notes || undefined,
    };

    if (formData.allocatedRate) {
      const allocatedRate = parseFloat(formData.allocatedRate);
      if (isNaN(allocatedRate) || allocatedRate < 0 || allocatedRate > 100) {
        open?.({
          type: "error",
          message: "验证失败",
          description: "分配比率必须在 0-100 之间",
        });
        return;
      }
      updateData.allocatedRate = allocatedRate;
    }

    setIsUpdating(true);
    try {
      const client = getTenantApiClient();
      await client.request({
        method: "PATCH",
        url: `/api/agents/me/subordinates/${id}`,
        data: updateData,
      });

      // 成功后返回列表页
      list("sub-agents");
    } catch (error: any) {
      open?.({
        type: "error",
        message: "更新失败",
        description:
          error?.response?.data?.message || error?.message || "未知错误",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    list("sub-agents");
  };

  const isLoading = subAgentsQuery.isLoading;

  if (isLoading) {
    return (
      <CreateView>
        <CreateViewHeader title="编辑下级" />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            加载中...
          </CardContent>
        </Card>
      </CreateView>
    );
  }

  if (!agent) {
    return (
      <CreateView>
        <CreateViewHeader title="编辑下级" />
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            下级代理不存在或无权限访问
          </CardContent>
        </Card>
      </CreateView>
    );
  }

  return (
    <CreateView>
      <CreateViewHeader title="编辑下级" />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="space-y-4 pt-6">
            {/* 代理名称 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                代理名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="请输入代理名称"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
            </div>

            {/* 账号（只读） */}
            <div className="space-y-2">
              <Label htmlFor="username">账号</Label>
              <Input
                id="username"
                value={agent.username}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">账号无法修改</p>
            </div>

            {/* 地址（钱包地址） */}
            <div className="space-y-2">
              <Label htmlFor="walletAddress">
                地址 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="walletAddress"
                placeholder="请输入 TRON 钱包地址"
                value={formData.walletAddress}
                onChange={(e) =>
                  handleInputChange("walletAddress", e.target.value)
                }
                required
              />
            </div>

            {/* 分配比率 */}
            <div className="space-y-2">
              <Label htmlFor="allocatedRate">分配比率</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="allocatedRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="请输入比例"
                  value={formData.allocatedRate}
                  onChange={(e) =>
                    handleInputChange("allocatedRate", e.target.value)
                  }
                  className="flex-1"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                分配给该代理的全局比率，相对于总投资金额（0 - 100%）
              </p>
            </div>

            {/* 备注 */}
            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Input
                id="notes"
                placeholder="请输入备注（选填）"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isUpdating}
            className="w-full sm:w-auto"
          >
            取消
          </Button>
          <Button type="submit" disabled={isUpdating} className="w-full sm:w-auto">
            {isUpdating ? "更新中..." : "完成"}
          </Button>
        </div>
      </form>
    </CreateView>
  );
}
