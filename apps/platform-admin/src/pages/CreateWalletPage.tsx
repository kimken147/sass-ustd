import { useEffect } from "react";
import { useCreate, useNotification } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import { ListView } from "@saas-platform/ui";
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
  FormDescription,
} from "@saas-platform/ui";
import { ArrowLeft } from "lucide-react";
import { SystemWalletType } from "@saas-platform/shared-types";

// Zod 验证 schema - 根据类型动态验证
const createWalletSchema = z
  .object({
    type: z
      .string()
      .min(1, "请选择钱包类型")
      .refine(
        (val) =>
          val === SystemWalletType.CONTRACT_EXECUTION ||
          val === SystemWalletType.REVENUE_DISTRIBUTION,
        "请选择有效的钱包类型"
      ),
    name: z
      .string()
      .min(1, "请输入钱包名称")
      .min(2, "钱包名称至少需要 2 个字符"),
    address: z
      .string()
      .min(1, "请输入钱包地址")
      .min(34, "钱包地址长度至少需要 34 个字符")
      .regex(
        /^T[A-Za-z0-9]{33}$/,
        "请输入有效的 TRON 钱包地址（以 T 开头，共 34 个字符）"
      ),
    privateKey: z.string().optional(),
  })
  .refine(
    (data) => {
      // 如果是授权合约钱包，私钥为必填
      if (data.type === SystemWalletType.CONTRACT_EXECUTION) {
        return data.privateKey && data.privateKey.trim().length > 0;
      }
      return true;
    },
    {
      message: "授权合约钱包必须提供私钥",
      path: ["privateKey"],
    }
  );

type CreateWalletFormData = z.infer<typeof createWalletSchema>;

export default function CreateWalletPage() {
  // 设置页面标题
  useEffect(() => {
    document.title = "创建钱包 - 平台管理后台";
  }, []);

  const navigate = useNavigate();
  const { open } = useNotification();

  // 创建钱包
  const createMutation = useCreate();
  const { mutate: createWallet, mutation } = createMutation;
  const isCreating = mutation?.isPending || false;

  // 使用 Refine 的 useForm hook
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    ...formProps
  } = useForm<CreateWalletFormData>({
    resolver: zodResolver(createWalletSchema) as any,
    defaultValues: {
      type: "",
      name: "",
      address: "",
      privateKey: "",
    },
  });

  // 监听类型变化，用于条件显示私钥栏位
  const walletType = watch("type");

  // 提交创建钱包
  const onSubmit = async (data: CreateWalletFormData) => {
    // 构建创建数据
    const createData: any = {
      name: data.name,
      address: data.address,
      type: data.type,
      chain: "tron" as const,
      status: "active" as const,
    };

    // 仅当类型为 CONTRACT_EXECUTION 时才包含私钥
    if (data.type === SystemWalletType.CONTRACT_EXECUTION && data.privateKey) {
      createData.privateKey = data.privateKey;
    }

    createWallet(
      {
        resource: "system-wallets",
        values: createData,
        errorNotification: false,
        successNotification: false,
      },
      {
        onSuccess: () => {
          open?.({
            type: "success",
            message: "创建成功",
            description: "钱包创建成功",
          });
          navigate("/wallets");
        },
        onError: (error: any) => {
          open?.({
            type: "error",
            message: "创建失败",
            description: error?.message || "创建钱包失败，请检查输入",
          });
        },
      }
    );
  };

  return (
    <ListView>
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/wallets")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </Button>
        <h2 className="text-2xl font-bold">创建钱包</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>钱包资讯</CardTitle>
        </CardHeader>
        <CardContent>
          <Form
            {...({
              control,
              handleSubmit,
              watch,
              formState: { errors },
              ...formProps,
            } as any)}
          >
            <form
              onSubmit={handleSubmit(onSubmit as any) as any}
              className="space-y-6"
            >
              {/* 钱包类型 */}
              <FormField
                control={control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>钱包类型 *</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择钱包类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={SystemWalletType.CONTRACT_EXECUTION}>
                          授权合约钱包
                        </SelectItem>
                        <SelectItem
                          value={SystemWalletType.REVENUE_DISTRIBUTION}
                        >
                          收款钱包
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      授权合约钱包用于执行智能合约，需要提供私钥
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 钱包名称 */}
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>钱包名称 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入钱包名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 钱包地址 */}
              <FormField
                control={control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>钱包地址 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入 TRON 钱包地址（以 T 开头，共 34 个字符）"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      TRON 钱包地址格式：以 T 开头，共 34 个字符
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 私钥 - 仅当类型为 CONTRACT_EXECUTION 时显示 */}
              {walletType === SystemWalletType.CONTRACT_EXECUTION && (
                <FormField
                  control={control}
                  name="privateKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>私钥 *</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="请输入私钥"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        授权合约钱包必须提供私钥，私钥将被加密存储
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* 操作按钮 */}
              <div className="flex items-center justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/wallets")}
                  disabled={isCreating}
                >
                  取消
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "创建中..." : "创建钱包"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </ListView>
  );
}
