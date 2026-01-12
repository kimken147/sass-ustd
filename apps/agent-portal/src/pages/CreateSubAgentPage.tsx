import { useState } from "react";
import { useNavigation } from "@refinedev/core";
import { CreateView, CreateViewHeader } from "@saas-platform/ui";
import { Button } from "@saas-platform/ui";
import { Input } from "@saas-platform/ui";
import { Label } from "@saas-platform/ui";
import { Card, CardContent } from "@saas-platform/ui";
import { getTenantApiClient } from "@saas-platform/api-client";

interface CreateSubAgentFormData {
  name: string;
  username: string;
  email: string;
  password: string;
  uplineRate: string;
  walletAddress: string;
  notes?: string;
}

export default function CreateSubAgentPage() {
  const { list } = useNavigation();
  const [isCreating, setIsCreating] = useState(false);

  // 表單狀態
  const [formData, setFormData] = useState<CreateSubAgentFormData>({
    name: "",
    username: "",
    email: "",
    password: "",
    uplineRate: "",
    walletAddress: "",
    notes: "",
  });

  // 處理表單輸入變更
  const handleInputChange = (
    field: keyof CreateSubAgentFormData,
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

    // 驗證必填字段
    if (
      !formData.name ||
      !formData.username ||
      !formData.email ||
      !formData.password ||
      !formData.uplineRate ||
      !formData.walletAddress
    ) {
      alert("請填寫所有必填字段");
      return;
    }

    const uplineRate = parseFloat(formData.uplineRate);
    if (isNaN(uplineRate) || uplineRate < 0 || uplineRate > 100) {
      alert("上級比率必須在 0-100 之間");
      return;
    }

    setIsCreating(true);
    try {
      const client = getTenantApiClient();
      await client.request({
        method: "POST",
        url: "/api/agents/me/subordinates",
        data: {
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          uplineRate: uplineRate,
          walletAddress: formData.walletAddress,
          notes: formData.notes || undefined,
        },
      });

      // 成功後返回列表頁
      list("sub-agents");
    } catch (error: any) {
      alert(
        `創建失敗：${
          error?.response?.data?.message ||
          error?.message ||
          "未知錯誤"
        }`
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    list("sub-agents");
  };

  return (
    <CreateView>
      <CreateViewHeader title="新增下級" />

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

            {/* 帳號 */}
            <div className="space-y-2">
              <Label htmlFor="username">
                帳號 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="username"
                placeholder="請輸入帳號"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="請輸入 Email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
              />
            </div>

            {/* 密碼 */}
            <div className="space-y-2">
              <Label htmlFor="password">
                密碼 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="請輸入密碼"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required
              />
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
              <Label htmlFor="uplineRate">
                分潤 <span className="text-destructive">*</span>
              </Label>
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
                  required
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
            disabled={isCreating}
          >
            取消
          </Button>
          <Button type="submit" disabled={isCreating}>
            {isCreating ? "建立中..." : "完成"}
          </Button>
        </div>
      </form>
    </CreateView>
  );
}
