import { useEffect } from "react";
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

// Zod 验证 schema
const systemWalletSchema = z.object({
  walletId: z.number().min(1, "请选择钱包"),
  name: z.string(),
  address: z.string(),
  percentage: z.number().min(1, "比例必须大于 0").max(100, "比例不能超过 100"),
});

const createSiteSchema = z
  .object({
    name: z.string().min(1, "请输入站点名称"),
    customDomain: z.string().optional(),
    authorizationWalletId: z.number().optional(),
    systemFeeRate: z
      .number()
      .min(0, "系统费率不能小于 0")
      .max(100, "系统费率不能超过 100")
      .default(10.0),
    systemWallets: z
      .array(systemWalletSchema)
      .min(1, "至少需要添加一个系统费钱包"),
    adminUsername: z
      .string()
      .min(3, "管理员帐号长度至少为 3 个字元")
      .max(50, "管理员帐号长度不能超过 50 个字元"),
    adminPassword: z
      .string()
      .min(6, "密码长度至少为 6 个字元")
      .max(100, "密码长度不能超过 100 个字元"),
    adminName: z.string().min(2, "管理员名称长度至少为 2 个字元"),
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
      message: "系统费钱包比例总和必须为 100%",
      path: ["systemWallets"],
    }
  );

type CreateSiteFormData = z.infer<typeof createSiteSchema>;

export default function CreateSitePage() {
  // 设置页面标题
  useEffect(() => {
    document.title = "创建站点 - 平台管理后台";
  }, []);

  const { list } = useNavigation();

  // 获取系统钱包列表（用于授权钱包和系统费钱包）
  const walletsQuery = useList<SystemWallet>({
    resource: "system-wallets",
    filters: [],
  });

  const wallets = walletsQuery.result?.data || [];

  // 获取可用于授权的钱包（类型为 CONTRACT_EXECUTION）
  const authorizationWallets = wallets.filter(
    (wallet: SystemWallet) =>
      wallet.type === SystemWalletType.CONTRACT_EXECUTION
  );

  // 获取可用于系统费的钱包（类型为 REVENUE_DISTRIBUTION）
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

  // 使用 useFieldArray 管理动态系统费钱包列表
  const { fields, append, remove } = useFieldArray({
    control,
    name: "systemWallets",
  });

  // 监听系统费钱包列表以计算总比例
  const systemWallets = watch("systemWallets");
  const totalPercentage = systemWallets.reduce(
    (sum: number, wallet: { percentage?: number }) =>
      sum + (wallet?.percentage || 0),
    0
  );

  // 添加系统费钱包
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

  // 处理表单提交
  const onSubmit = async (data: CreateSiteFormData) => {
    // 构建创建租户的数据
    const slug = data.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // 从 systemWallets 中只提取 walletId 和 percentage（后端会自动填充 name 和 address）
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
      // 管理员帐号资讯
      adminUsername: data.adminUsername,
      adminPassword: data.adminPassword,
      adminName: data.adminName,
      // 如果选择了授权钱包，设置到 cryptoConfig
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
      <CreateViewHeader title="设置站点" />

      <Form
        {...({
          control,
          handleSubmit,
          watch,
          formState: { errors },
          ...formProps,
        } as any)}
      >
        <form onSubmit={handleSubmit(onSubmit as any) as any}>
          <Card>
            <CardHeader>
              <CardTitle>站点资讯</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 站点名称 */}
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>站点名称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入站点名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 站点域名 */}
              <FormField
                control={control}
                name="customDomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>站点域名</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入站点域名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 系统费率 */}
              <FormField
                control={control}
                name="systemFeeRate"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>系统费率 (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="请输入系统费率"
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

          {/* 授权钱包区域 */}
          <Card>
            <CardHeader>
              <CardTitle>授权钱包</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={control}
                name="authorizationWalletId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>授权钱包</FormLabel>
                    <Select
                      value={field.value?.toString() || undefined}
                      onValueChange={(value) =>
                        field.onChange(value ? parseInt(value) : undefined)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择钱包" />
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

          {/* 系统费钱包区域 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>系统费钱包</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // TODO: 等新增钱包页面开发完成后，改为跳转到新增钱包页面
                    // 例如: navigate("/wallets/create");
                    handleAddSystemWallet();
                  }}
                  disabled={systemFeeWallets.length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新增钱包
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

              {/* 系统费钱包列表 */}
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
                    尚未添加系统费钱包
                  </p>
                )}

                {/* 总比例提示 */}
                {fields.length > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">总比例：</span>
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

                {/* 显示系统费钱包总体错误讯息 */}
                {errors.systemWallets && (
                  <p className="text-sm font-medium text-destructive">
                    {typeof errors.systemWallets === "object" &&
                    "message" in errors.systemWallets
                      ? String(errors.systemWallets.message)
                      : "系统费钱包配置有误"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 管理员帐号区域 */}
          <Card>
            <CardHeader>
              <CardTitle>管理员帐号</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 管理员帐号 */}
              <FormField
                control={control}
                name="adminUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>管理员帐号</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入管理员帐号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 管理员密码 */}
              <FormField
                control={control}
                name="adminPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>管理员密码</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="请输入管理员密码"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 管理员名称 */}
              <FormField
                control={control}
                name="adminName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>管理员名称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入管理员名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 操作按钮 */}
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
              {formLoading ? "创建中..." : "完成"}
            </Button>
          </div>
        </form>
      </Form>
    </CreateView>
  );
}
