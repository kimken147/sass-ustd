import { useList, useNavigation } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreateView, CreateViewHeader } from "@saas-platform/ui";
import { Button } from "@saas-platform/ui";
import { Input } from "@saas-platform/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@saas-platform/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@saas-platform/ui";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@saas-platform/ui";
import { Plus, Trash2 } from "lucide-react";
import { SystemWallet, SystemWalletType } from "@saas-platform/shared-types";
import { useFieldArray } from "react-hook-form";

// Zod 驗證 schema
const systemWalletSchema = z.object({
  walletId: z.number().min(1, "請選擇錢包"),
  name: z.string(),
  address: z.string(),
  percentage: z.number().min(1, "比例必須大於 0").max(100, "比例不能超過 100"),
});

const createSiteSchema = z
  .object({
    name: z.string().min(1, "請輸入站點名稱"),
    customDomain: z.string().optional(),
    authorizationWalletId: z.number().optional(),
    systemFeeRate: z
      .number()
      .min(0, "系統費率不能小於 0")
      .max(100, "系統費率不能超過 100")
      .default(10.0),
    systemWallets: z
      .array(systemWalletSchema)
      .min(1, "至少需要添加一個系統費錢包"),
    adminUsername: z
      .string()
      .min(3, "管理員帳號長度至少為 3 個字元")
      .max(50, "管理員帳號長度不能超過 50 個字元"),
    adminPassword: z
      .string()
      .min(6, "密碼長度至少為 6 個字元")
      .max(100, "密碼長度不能超過 100 個字元"),
    adminName: z.string().min(2, "管理員名稱長度至少為 2 個字元"),
  })
  .refine(
    (data) => {
      const totalPercentage = data.systemWallets.reduce(
        (sum, wallet) => sum + (wallet.percentage || 0),
        0
      );
      return totalPercentage === 100;
    },
    {
      message: "系統費錢包比例總和必須為 100%",
      path: ["systemWallets"],
    }
  );

type CreateSiteFormData = z.infer<typeof createSiteSchema>;

export default function CreateSitePage() {
  const { list } = useNavigation();

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

  // 使用 Refine 的 useForm hook
  const {
    refineCore: { onFinish, formLoading },
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    ...formProps
  } = useForm<CreateSiteFormData>({
    resolver: zodResolver(createSiteSchema) as any,
    defaultValues: {
      name: "",
      customDomain: "",
      authorizationWalletId: undefined,
      systemFeeRate: 10.0,
      systemWallets: [],
      adminUsername: "",
      adminPassword: "",
      adminName: "",
    },
    refineCoreProps: {
      resource: "tenants",
      onMutationSuccess: () => {
        list("sites");
      },
    },
  });

  // 使用 useFieldArray 管理動態系統費錢包列表
  const { fields, append, remove } = useFieldArray({
    control,
    name: "systemWallets",
  });

  // 監聽系統費錢包列表以計算總比例
  const systemWallets = watch("systemWallets");
  const totalPercentage = systemWallets.reduce(
    (sum: number, wallet: { percentage?: number }) =>
      sum + (wallet?.percentage || 0),
    0
  );

  // 添加系統費錢包
  const handleAddSystemWallet = () => {
    const selectedWallet = systemFeeWallets[0];
    if (!selectedWallet) return;

    append({
      walletId: selectedWallet.id,
      name: selectedWallet.name,
      address: selectedWallet.address,
      percentage: 0,
    });
  };

  // 處理表單提交
  const onSubmit = async (data: CreateSiteFormData) => {
    // 構建創建租戶的數據
    const slug = data.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // 從 systemWallets 中只提取 walletId 和 percentage（後端會自動填充 name 和 address）
    const systemWallets = data.systemWallets.map((wallet) => ({
      walletId: wallet.walletId,
      percentage: wallet.percentage,
    }));

    const createData: any = {
      name: data.name,
      slug: slug,
      customDomain: data.customDomain || undefined,
      systemWallets: systemWallets,
      systemFeeRate: data.systemFeeRate || 10.0,
      // 管理員帳號資訊
      adminUsername: data.adminUsername,
      adminPassword: data.adminPassword,
      adminName: data.adminName,
      // 如果選擇了授權錢包，設置到 cryptoConfig
      ...(data.authorizationWalletId && {
        cryptoConfig: {
          executionWalletId: data.authorizationWalletId,
        },
      }),
    };

    await onFinish(createData);
  };

  const handleCancel = () => {
    list("sites");
  };

  return (
    <CreateView>
      <CreateViewHeader title="設置站點" />

      <Form
        {...({
          control,
          handleSubmit,
          watch,
          formState: { errors },
          ...formProps,
        } as any)}
      >
        <form onSubmit={handleSubmit(onSubmit) as any}>
          <Card>
            <CardHeader>
              <CardTitle>站點資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 站點名稱 */}
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>站點名稱</FormLabel>
                    <FormControl>
                      <Input placeholder="請輸入站點名稱" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 站點域名 */}
              <FormField
                control={control}
                name="customDomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>站點域名</FormLabel>
                    <FormControl>
                      <Input placeholder="請輸入站點域名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 系統費率 */}
              <FormField
                control={control}
                name="systemFeeRate"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>系統費率 (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="請輸入系統費率"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseFloat(e.target.value) : 0
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 授權錢包區域 */}
          <Card>
            <CardHeader>
              <CardTitle>授權錢包</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={control}
                name="authorizationWalletId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>授權錢包</FormLabel>
                    <Select
                      value={field.value?.toString() || undefined}
                      onValueChange={(value) =>
                        field.onChange(value ? parseInt(value) : undefined)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="請選擇錢包" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {authorizationWallets.map((wallet: SystemWallet) => (
                          <SelectItem
                            key={wallet.id}
                            value={wallet.id.toString()}
                          >
                            {wallet.name} - {wallet.address}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              {fields.length > 0 && (
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
                {fields.map((field, index: number) => {
                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-12 gap-4 items-center"
                    >
                      <div className="col-span-4">
                        <FormField
                          control={control}
                          name={`systemWallets.${index}.walletId`}
                          render={({ field }) => (
                            <FormItem>
                              <Select
                                value={field.value?.toString() || ""}
                                onValueChange={(value) => {
                                  const selectedWallet = systemFeeWallets.find(
                                    (w) => w.id === parseInt(value)
                                  );
                                  if (selectedWallet) {
                                    field.onChange(parseInt(value));
                                    // 使用 setValue 來更新 name 和 address
                                    setValue(
                                      `systemWallets.${index}.name`,
                                      selectedWallet.name
                                    );
                                    setValue(
                                      `systemWallets.${index}.address`,
                                      selectedWallet.address
                                    );
                                  }
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {systemFeeWallets.map((w: SystemWallet) => (
                                    <SelectItem
                                      key={w.id}
                                      value={w.id.toString()}
                                    >
                                      {w.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-4">
                        <FormField
                          control={control}
                          name={`systemWallets.${index}.percentage`}
                          render={({ field }: { field: any }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  max="100"
                                  placeholder="比例%"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {fields.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    尚未添加系統費錢包
                  </p>
                )}

                {/* 總比例提示 */}
                {fields.length > 0 && (
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

                {/* 顯示系統費錢包總體錯誤訊息 */}
                {errors.systemWallets && (
                  <p className="text-sm font-medium text-destructive">
                    {typeof errors.systemWallets === "object" &&
                    "message" in errors.systemWallets
                      ? String(errors.systemWallets.message)
                      : "系統費錢包配置有誤"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 管理員帳號區域 */}
          <Card>
            <CardHeader>
              <CardTitle>管理員帳號</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 管理員帳號 */}
              <FormField
                control={control}
                name="adminUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>管理員帳號</FormLabel>
                    <FormControl>
                      <Input placeholder="請輸入管理員帳號" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 管理員密碼 */}
              <FormField
                control={control}
                name="adminPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>管理員密碼</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="請輸入管理員密碼"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 管理員名稱 */}
              <FormField
                control={control}
                name="adminName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>管理員名稱</FormLabel>
                    <FormControl>
                      <Input placeholder="請輸入管理員名稱" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 操作按鈕 */}
          <div className="flex justify-end gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={formLoading}
            >
              取消
            </Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading ? "建立中..." : "完成"}
            </Button>
          </div>
        </form>
      </Form>
    </CreateView>
  );
}
