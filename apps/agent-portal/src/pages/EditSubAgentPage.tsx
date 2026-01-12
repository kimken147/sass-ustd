import { useState, useEffect } from "react";
import { useNavigation, useCustom } from "@refinedev/core";
import { CreateView, CreateViewHeader } from "@saas-platform/ui";
import { Button } from "@saas-platform/ui";
import { Input } from "@saas-platform/ui";
import { Label } from "@saas-platform/ui";
import { Card, CardContent } from "@saas-platform/ui";
import { useParams } from "react-router";
import { getTenantApiClient } from "@saas-platform/api-client";

interface Agent {
  id: number;
  userId: number;
  username: string;
  name: string;
  commission: {
    uplineRate: number;
    selfRate: number;
  };
  wallet?: {
    address: string;
  };
  notes?: string;
}

interface EditSubAgentFormData {
  name: string;
  uplineRate: string;
  walletAddress: string;
  notes?: string;
}

export default function EditSubAgentPage() {
  const { id } = useParams<{ id: string }>();
  const { list } = useNavigation();
  const [isUpdating, setIsUpdating] = useState(false);

  // 獲取下級代理列表，找到要編輯的代理
  const { query: subAgentsQuery, result: subAgentsResult } =
    useCustom<Agent[]>({
      url: "/api/agents/me/subordinates",
      method: "get",
    });

  const subAgents = (subAgentsResult.data as Agent[]) || [];
  const agent = subAgents.find((a) => a.id === parseInt(id || "0"));

  // 表單狀態
  const [formData, setFormData] = useState<EditSubAgentFormData>({
    name: "",
    uplineRate: "",
    walletAddress: "",
    notes: "",
  });

  // 當代理數據加載完成時，初始化表單
  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        uplineRate: agent.commission.uplineRate.toString(),
        walletAddress: agent.wallet?.address || "",
        notes: agent.notes || "",
      });
    }
  }, [agent]);

  // 處理表單輸入變更
  const handleInputChange = (
    field: keyof EditSubAgentFormData,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id || !agent) {
      alert("下級代理不存在");
      return;
    }

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

    setIsUpdating(true);
    try {
      const client = getTenantApiClient();
      await client.request({
        method: "PATCH",
        url: `/api/agents/me/subordinates/${id}`,
        data: updateData,
      });

      // 成功後返回列表頁
      list("sub-agents");
    } catch (error: any) {
      alert(
        `更新失敗：${
          error?.response?.data?.message ||
          error?.message ||
          "未知錯誤"
        }`
      );
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
        <CreateViewHeader title="編輯下級" />
        <div className="text-center py-8 text-muted-foreground">載入中...</div>
      </CreateView>
    );
  }

  if (!agent) {
    return (
      <CreateView>
        <CreateViewHeader title="編輯下級" />
        <div className="text-center py-8 text-destructive">
          下級代理不存在或無權限訪問
        </div>
      </CreateView>
    );
  }

  return (
    <CreateView>
      <CreateViewHeader title="編輯下級" />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="space-y-4 pt-6">
            {/* 代理名稱 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                代理名稱 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="請輸入代理名稱"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
            </div>

            {/* 帳號（只讀） */}
            <div className="space-y-2">
              <Label htmlFor="username">帳號</Label>
              <Input
                id="username"
                value={agent.username}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">帳號無法修改</p>
            </div>

            {/* 地址（錢包地址） */}
            <div className="space-y-2">
              <Label htmlFor="walletAddress">
                地址 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="walletAddress"
                placeholder="請輸入 TRON 錢包地址"
                value={formData.walletAddress}
                onChange={(e) =>
                  handleInputChange("walletAddress", e.target.value)
                }
                required
              />
            </div>

            {/* 分潤（上級比率） */}
            <div className="space-y-2">
              <Label htmlFor="uplineRate">分潤</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="uplineRate"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="請輸入比例"
                  value={formData.uplineRate}
                  onChange={(e) =>
                    handleInputChange("uplineRate", e.target.value)
                  }
                  className="flex-1"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                上級比率：給上級代理的佣金比例（自己保留 = 100% - 上級比率）
              </p>
            </div>

            {/* 備註 */}
            <div className="space-y-2">
              <Label htmlFor="notes">備註</Label>
              <Input
                id="notes"
                placeholder="請輸入備註（選填）"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 操作按鈕 */}
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
