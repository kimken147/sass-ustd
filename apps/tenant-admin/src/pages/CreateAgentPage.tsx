import { useState } from "react";
import { useCreate, useList, useNavigation } from "@refinedev/core";
import { CreateView, CreateViewHeader } from "@saas-platform/ui";
import { Button } from "@saas-platform/ui";
import { Input } from "@saas-platform/ui";
import { Label } from "@saas-platform/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@saas-platform/ui";
import { Card, CardContent } from "@saas-platform/ui";

interface Agent {
  id: number;
  name: string;
  level: number;
}

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

export default function CreateAgentPage() {
  const { list } = useNavigation();
  const createMutation = useCreate();
  const { mutate: createAgent, mutation } = createMutation;
  const isCreating = mutation.isPending || false;

  // 表單狀態
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

  // 獲取代理列表（用於選擇上級代理）
  const agentsQuery = useList<Agent>({
    resource: "agents",
    filters: [],
  });

  const agents = agentsQuery.result?.data || [];

  // 處理表單輸入變更
  const handleInputChange = (
    field: keyof CreateAgentFormData,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 提交表單
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

    // 構建創建代理的數據
    const createData: any = {
      name: formData.name,
      username: formData.username,
      email: formData.email,
      password: formData.password,
      parentAgentId: formData.parentAgentId || undefined,
      uplineRate: uplineRate,
      walletAddress: formData.walletAddress,
      notes: formData.notes || undefined,
    };

    createAgent(
      {
        resource: "agents",
        values: createData,
      },
      {
        onSuccess: () => {
          list("agents");
        },
        onError: (error: any) => {
          console.error("創建代理失敗:", error);
          alert(
            error?.response?.data?.message ||
              error?.message ||
              "創建代理失敗"
          );
        },
      }
    );
  };

  const handleCancel = () => {
    list("agents");
  };

  return (
    <CreateView>
      <CreateViewHeader title="新增代理" />

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
                placeholder="請輸入錢包地址"
                value={formData.walletAddress}
                onChange={(e) =>
                  handleInputChange("walletAddress", e.target.value)
                }
                required
              />
            </div>

            {/* 上級代理 */}
            <div className="space-y-2">
              <Label htmlFor="parentAgentId">上級代理</Label>
              <Select
                value={formData.parentAgentId?.toString() || undefined}
                onValueChange={(value) =>
                  handleInputChange(
                    "parentAgentId",
                    value ? parseInt(value) : undefined
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="請選擇上級代理" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">無（預設上級為站長）</SelectItem>
                  {agents.map((agent: Agent) => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name} (層級: {agent.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
