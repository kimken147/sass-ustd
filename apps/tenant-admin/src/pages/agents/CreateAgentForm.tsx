import { useState } from "react";
import { useCreate } from "@refinedev/core";
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

  const createMutation = useCreate();
  const { mutate: createAgent, mutation } = createMutation;
  const isCreating = mutation.isPending || false;

  const handleSubmit = () => {
    // 驗證必填字段
    if (!formData.name || !formData.username || !formData.walletAddress) {
      alert("請填寫所有必填字段");
      return;
    }

    if (!formData.email || !formData.password) {
      alert("新增代理需要填寫 Email 和密碼");
      return;
    }

    if (!formData.uplineRate) {
      alert("請填寫上級比率");
      return;
    }

    const uplineRate = parseFloat(formData.uplineRate);
    if (isNaN(uplineRate) || uplineRate < 0 || uplineRate > 100) {
      alert("上級比率必須在 0-100 之間");
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
      },
      {
        onSuccess: () => {
          // 重置表單
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
          alert(
            `創建失敗：${
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
        <CardTitle>新增代理</CardTitle>
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
            <label className="text-sm font-medium">帳號 *</label>
            <Input
              placeholder="請輸入帳號"
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
              placeholder="請輸入 Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">密碼 *</label>
            <Input
              type="password"
              placeholder="請輸入密碼"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">上級代理 ID（選填）</label>
            <Input
              type="number"
              placeholder="留空則預設上級為站長"
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
            <label className="text-sm font-medium">上級比率% *</label>
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
            <Button onClick={handleSubmit} disabled={isCreating}>
              {isCreating ? "處理中..." : "確定"}
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
