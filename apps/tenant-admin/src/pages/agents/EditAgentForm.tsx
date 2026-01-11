import { useState, useEffect } from "react";
import { useUpdate } from "@refinedev/core";
import { Button } from "@saas-platform/ui";
import { Input } from "@saas-platform/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@saas-platform/ui";

interface Agent {
  id: number;
  name: string;
  username: string;
  parentAgentId?: number;
  commission: {
    uplineRate: number;
  };
  wallet?: {
    address: string;
  };
  notes?: string;
}

interface EditAgentFormData {
  name: string;
  uplineRate: string;
  walletAddress: string;
  notes?: string;
}

interface EditAgentFormProps {
  agent: Agent;
  onSuccess?: () => void;
  onCancel: () => void;
}

export default function EditAgentForm({
  agent,
  onSuccess,
  onCancel,
}: EditAgentFormProps) {
  const [formData, setFormData] = useState<EditAgentFormData>({
    name: agent.name,
    uplineRate: agent.commission.uplineRate.toString(),
    walletAddress: agent.wallet?.address || "",
    notes: agent.notes || "",
  });

  // 當 agent 改變時更新表單數據
  useEffect(() => {
    setFormData({
      name: agent.name,
      uplineRate: agent.commission.uplineRate.toString(),
      walletAddress: agent.wallet?.address || "",
      notes: agent.notes || "",
    });
  }, [agent]);

  const updateMutation = useUpdate();
  const { mutate: updateAgent, mutation } = updateMutation;
  const isUpdating = mutation.isPending || false;

  const handleSubmit = () => {
    // 驗證必填字段
    if (!formData.name || !formData.walletAddress) {
      alert("請填寫所有必填字段");
      return;
    }

    const updateData: any = {
      name: formData.name,
      walletAddress: formData.walletAddress,
      notes: formData.notes || undefined,
    };

    if (formData.uplineRate) {
      const uplineRate = parseFloat(formData.uplineRate);
      if (isNaN(uplineRate) || uplineRate < 0 || uplineRate > 100) {
        alert("上級比率必須在 0-100 之間");
        return;
      }
      updateData.uplineRate = uplineRate;
    }

    updateAgent(
      {
        resource: "agents",
        id: agent.id.toString(),
        values: updateData,
      },
      {
        onSuccess: () => {
          onSuccess?.();
        },
        onError: (error: any) => {
          alert(
            `更新失敗：${
              error?.response?.data?.message ||
              error?.message ||
              "未知錯誤"
            }`
          );
        },
      }
    );
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>編輯代理</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">代理名稱 *</label>
            <Input
              placeholder="請輸入代理名稱"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">帳號</label>
            <Input
              placeholder="帳號"
              value={agent.username}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              帳號無法修改
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">上級比率%</label>
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="請輸入上級比率（0-100）"
              value={formData.uplineRate}
              onChange={(e) =>
                setFormData({ ...formData, uplineRate: e.target.value })
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">錢包地址 *</label>
            <Input
              placeholder="請輸入 TRON 錢包地址"
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
            <label className="text-sm font-medium">備註</label>
            <Input
              placeholder="請輸入備註（選填）"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button onClick={handleSubmit} disabled={isUpdating}>
              {isUpdating ? "處理中..." : "確定"}
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
