import { useState } from "react";
import { useCreate, useNotification } from "@refinedev/core";
import { Button } from "@saas-platform/ui";
import { Input } from "@saas-platform/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@saas-platform/ui";

interface CreateAgentFormData {
  name: string;
  username: string;
  email: string;
  password: string;
  parentAgentId?: number;
  uplineRate: string;
  walletAddress: string;
  notes?: string;
}

interface CreateAgentFormProps {
  onSuccess?: () => void;
  onCancel: () => void;
}

export default function CreateAgentForm({
  onSuccess,
  onCancel,
}: CreateAgentFormProps) {
  const [formData, setFormData] = useState<CreateAgentFormData>({
    name: "",
    username: "",
    email: "",
    password: "",
    parentAgentId: undefined,
    uplineRate: "",
    walletAddress: "",
    notes: "",
  });

  const { open } = useNotification();
  const createMutation = useCreate();
  const { mutate: createAgent, mutation } = createMutation;
  const isCreating = mutation.isPending || false;

  const handleSubmit = () => {
    // 验证必填字段
    if (!formData.name || !formData.username || !formData.walletAddress) {
      open?.({
        type: "error",
        message: "验证失败",
        description: "请填写所有必填字段",
      });
      return;
    }

    if (!formData.email || !formData.password) {
      open?.({
        type: "error",
        message: "验证失败",
        description: "新增代理需要填写 Email 和密码",
      });
      return;
    }

    if (!formData.uplineRate) {
      open?.({
        type: "error",
        message: "验证失败",
        description: "请填写上级比率",
      });
      return;
    }

    const uplineRate = parseFloat(formData.uplineRate);
    if (isNaN(uplineRate) || uplineRate < 0 || uplineRate > 100) {
      open?.({
        type: "error",
        message: "验证失败",
        description: "上级比率必须在 0-100 之间",
      });
      return;
    }

    createAgent(
      {
        resource: "agents",
        values: {
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          parentAgentId: formData.parentAgentId || undefined,
          uplineRate: uplineRate,
          walletAddress: formData.walletAddress,
          notes: formData.notes || undefined,
        },
        errorNotification: false,
      },
      {
        onSuccess: () => {
          // 重置表单
          setFormData({
            name: "",
            username: "",
            email: "",
            password: "",
            parentAgentId: undefined,
            uplineRate: "",
            walletAddress: "",
            notes: "",
          });
          onSuccess?.();
        },
        onError: (error: any) => {
          open?.({
            type: "error",
            message: "创建失败",
            description:
              error?.response?.data?.message || error?.message || "未知错误",
          });
        },
      }
    );
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>新增代理</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">代理名称 *</label>
            <Input
              placeholder="请输入代理名称"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">账号 *</label>
            <Input
              placeholder="请输入账号"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email *</label>
            <Input
              type="email"
              placeholder="请输入 Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">密码 *</label>
            <Input
              type="password"
              placeholder="请输入密码"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">上级代理 ID（选填）</label>
            <Input
              type="number"
              placeholder="留空则预设上级为站长"
              value={formData.parentAgentId || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  parentAgentId: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">上级比率% *</label>
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="请输入上级比率（0-100）"
              value={formData.uplineRate}
              onChange={(e) =>
                setFormData({ ...formData, uplineRate: e.target.value })
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">钱包地址 *</label>
            <Input
              placeholder="请输入 TRON 钱包地址"
              value={formData.walletAddress}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  walletAddress: e.target.value,
                })
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">备注</label>
            <Input
              placeholder="请输入备注（选填）"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button onClick={handleSubmit} disabled={isCreating}>
              {isCreating ? "处理中..." : "确定"}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
