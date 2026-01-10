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
import { Card, CardContent, CardHeader, CardTitle } from "@saas-platform/ui";
import { Plus, Trash2 } from "lucide-react";
import {
  SystemWallet,
  SystemWalletAssignment,
  SystemWalletType,
} from "@saas-platform/shared-types";

interface CreateSiteFormData {
  name: string;
  email: string;
  customDomain?: string;
  authorizationWalletId?: number;
  systemWallets: SystemWalletAssignment[];
}

export default function CreateSitePage() {
  const { list } = useNavigation();
  const createMutation = useCreate();
  const { mutate: createSite, mutation } = createMutation;
  // mutation 是 UseMutationResult，包含 isPending 屬性
  const isCreating = mutation.isPending || false;

  // 表單狀態
  const [formData, setFormData] = useState<CreateSiteFormData>({
    name: "",
    email: "",
    customDomain: "",
    authorizationWalletId: undefined,
    systemWallets: [],
  });

  // 獲取系統錢包列表（用於授權錢包和系統費錢包）
  const walletsQuery = useList<SystemWallet>({
    resource: "system-wallets",
    filters: [],
  });

  const wallets = walletsQuery.result?.data || [];

  // 獲取可用於授權的錢包（類型為 CONTRACT_EXECUTION）
  const authorizationWallets = wallets.filter(
    (wallet: SystemWallet) =>
      wallet.type === SystemWalletType.CONTRACT_EXECUTION
  );

  // 獲取可用於系統費的錢包（類型為 REVENUE_DISTRIBUTION）
  const systemFeeWallets = wallets.filter(
    (wallet: SystemWallet) =>
      wallet.type === SystemWalletType.REVENUE_DISTRIBUTION
  );

  // 處理表單輸入變更
  const handleInputChange = (field: keyof CreateSiteFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 添加系統費錢包
  const handleAddSystemWallet = () => {
    const selectedWallet = systemFeeWallets[0];
    if (!selectedWallet) return;

    const newWallet: SystemWalletAssignment = {
      walletId: selectedWallet.id,
      name: selectedWallet.name,
      address: selectedWallet.address,
      percentage: 0,
    };
    setFormData((prev) => ({
      ...prev,
      systemWallets: [...prev.systemWallets, newWallet],
    }));
  };

  // 移除系統費錢包
  const handleRemoveSystemWallet = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      systemWallets: prev.systemWallets.filter((_, i) => i !== index),
    }));
  };

  // 更新系統費錢包
  const handleUpdateSystemWallet = (
    index: number,
    field: keyof SystemWalletAssignment,
    value: any
  ) => {
    setFormData((prev) => {
      const updated = [...prev.systemWallets];
      const updatedWallet = {
        ...updated[index],
        [field]: value,
      };

      // 當 walletId 改變時，自動更新 name 和 address
      if (field === "walletId") {
        const selectedWallet = systemFeeWallets.find((w) => w.id === value);
        if (selectedWallet) {
          updatedWallet.name = selectedWallet.name;
          updatedWallet.address = selectedWallet.address;
        }
      }

      updated[index] = updatedWallet;
      return {
        ...prev,
        systemWallets: updated,
      };
    });
  };

  // 計算總比例
  const totalPercentage = formData.systemWallets.reduce(
    (sum, wallet) => sum + (wallet.percentage || 0),
    0
  );

  // 提交表單
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 驗證系統費錢包比例總和必須為 100%
    if (totalPercentage !== 100) {
      alert(`系統費錢包比例總和必須為 100%，當前為 ${totalPercentage}%`);
      return;
    }

    // 驗證必填字段
    if (!formData.name || !formData.email) {
      alert("請填寫站點名稱和電子郵件");
      return;
    }

    // 驗證系統費錢包至少一個
    if (formData.systemWallets.length === 0) {
      alert("至少需要添加一個系統費錢包");
      return;
    }

    // 構建創建租戶的數據
    const slug = formData.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const createData: any = {
      name: formData.name,
      slug: slug,
      email: formData.email,
      customDomain: formData.customDomain || undefined,
      systemWallets: formData.systemWallets,
      systemFeeRate: 10.0, // 預設系統費率
      // 如果選擇了授權錢包，設置到 cryptoConfig
      ...(formData.authorizationWalletId && {
        cryptoConfig: {
          executionWalletId: formData.authorizationWalletId,
        },
      }),
    };

    createSite(
      {
        resource: "tenants",
        values: createData,
      },
      {
        onSuccess: () => {
          list("sites");
        },
        onError: (error: any) => {
          console.error("創建站台失敗:", error);
          alert(error?.message || "創建站台失敗");
        },
      }
    );
  };

  const handleCancel = () => {
    list("sites");
  };

  return (
    <CreateView>
      <CreateViewHeader title="設置站點" />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>站點資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 站點名稱 */}
            <div className="space-y-2">
              <Label htmlFor="name">站點名稱</Label>
              <Input
                id="name"
                placeholder="請輸入站點名稱"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
            </div>

            {/* 站點域名 */}
            <div className="space-y-2">
              <Label htmlFor="customDomain">站點域名</Label>
              <Input
                id="customDomain"
                placeholder="請輸入站點域名"
                value={formData.customDomain}
                onChange={(e) =>
                  handleInputChange("customDomain", e.target.value)
                }
              />
            </div>

            {/* 電子郵件 */}
            <div className="space-y-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                type="email"
                placeholder="請輸入電子郵件"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* 授權錢包區域 */}
        <Card>
          <CardHeader>
            <CardTitle>授權錢包</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>授權錢包</Label>
              <Select
                value={formData.authorizationWalletId?.toString() || undefined}
                onValueChange={(value) =>
                  handleInputChange("authorizationWalletId", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="請選擇錢包" />
                </SelectTrigger>
                <SelectContent>
                  {authorizationWallets.map((wallet: SystemWallet) => (
                    <SelectItem key={wallet.id} value={wallet.id.toString()}>
                      {wallet.name} - {wallet.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 系統費錢包區域 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>系統費錢包</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: 等新增錢包頁面開發完成後，改為跳轉到新增錢包頁面
                  // 例如: navigate("/wallets/create");
                  handleAddSystemWallet();
                }}
                disabled={systemFeeWallets.length === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                新增錢包
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* 表頭 */}
            {formData.systemWallets.length > 0 && (
              <div className="grid grid-cols-12 gap-4 mb-4 pb-2 border-b">
                <div className="col-span-4 text-sm font-medium text-muted-foreground">
                  名稱
                </div>
                <div className="col-span-4 text-sm font-medium text-muted-foreground">
                  分配比例%
                </div>
                <div className="col-span-4 text-sm font-medium text-muted-foreground">
                  操作
                </div>
              </div>
            )}

            {/* 系統費錢包列表 */}
            <div className="space-y-4">
              {formData.systemWallets.map((wallet, index) => {
                return (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-4 items-center"
                  >
                    <div className="col-span-4">
                      <Select
                        value={wallet.walletId.toString()}
                        onValueChange={(value) =>
                          handleUpdateSystemWallet(
                            index,
                            "walletId",
                            parseInt(value)
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {systemFeeWallets.map((w: SystemWallet) => (
                            <SelectItem key={w.id} value={w.id.toString()}>
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="比例%"
                        value={wallet.percentage || ""}
                        onChange={(e) =>
                          handleUpdateSystemWallet(
                            index,
                            "percentage",
                            parseInt(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className="col-span-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSystemWallet(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {formData.systemWallets.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  尚未添加系統費錢包
                </p>
              )}

              {/* 總比例提示 */}
              {formData.systemWallets.length > 0 && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">總比例：</span>
                  <span
                    className={`text-sm font-bold ${
                      totalPercentage === 100
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {totalPercentage}%
                  </span>
                </div>
              )}
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
