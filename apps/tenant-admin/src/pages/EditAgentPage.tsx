import { useState, useEffect } from "react";
import { useUpdate, useOne, useNavigation, useNotification } from "@refinedev/core";
import { CreateView, CreateViewHeader } from "@saas-platform/ui";
import { Button } from "@saas-platform/ui";
import { Input } from "@saas-platform/ui";
import { Label } from "@saas-platform/ui";
import { Card, CardContent } from "@saas-platform/ui";
import { useParams } from "react-router";

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

interface EditAgentFormData {
  name: string;
  allocatedRate: string;
  walletAddress: string;
  notes?: string;
}

export default function EditAgentPage() {
  // 设置页面标题
  useEffect(() => {
    document.title = "编辑代理 - 租户管理后台";
  }, []);

  const { id } = useParams<{ id: string }>();
  const { list } = useNavigation();
  const { open } = useNotification();
  const updateMutation = useUpdate();
  const { mutate: updateAgent, mutation } = updateMutation;
  const isUpdating = mutation.isPending || false;

  // 获取代理详情
  const { query, result: agent } = useOne<Agent>({
    resource: "agents",
    id: id || "",
    queryOptions: {
      enabled: !!id,
    },
  });

  const isLoading = query.isLoading;

  // 表单状态
  const [formData, setFormData] = useState<EditAgentFormData>({
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
    field: keyof EditAgentFormData,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!id || !agent) {
      open?.({
        type: "error",
        message: "错误",
        description: "代理不存在",
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

    updateAgent(
      {
        resource: "agents",
        id: id,
        values: updateData,
      },
      {
        onSuccess: () => {
          list("agents");
        },
        onError: (error: any) => {
          open?.({
            type: "error",
            message: "更新失败",
            description:
              error?.response?.data?.message ||
              error?.message ||
              "更新代理失败",
          });
        },
      }
    );
  };

  const handleCancel = () => {
    list("agents");
  };

  if (isLoading) {
    return (
      <CreateView>
        <CreateViewHeader title="编辑代理" />
        <div className="text-center py-8 text-muted-foreground">载入中...</div>
      </CreateView>
    );
  }

  if (!agent) {
    return (
      <CreateView>
        <CreateViewHeader title="编辑代理" />
        <div className="text-center py-8 text-destructive">代理不存在</div>
      </CreateView>
    );
  }

  return (
    <CreateView>
      <CreateViewHeader title="编辑代理" />

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
                placeholder="请输入钱包地址"
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
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isUpdating}
          >
            取消
          </Button>
          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? "更新中..." : "完成"}
          </Button>
        </div>
      </form>
    </CreateView>
  );
}
