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

// Zod 驗證 schema - 根據類型動態驗證
const createWalletSchema = z
  .object({
    type: z
      .string()
      .min(1, "請選擇錢包類型")
      .refine(
        (val) =>
          val === SystemWalletType.CONTRACT_EXECUTION ||
          val === SystemWalletType.REVENUE_DISTRIBUTION,
        "請選擇有效的錢包類型"
      ),
    name: z
      .string()
      .min(1, "請輸入錢包名稱")
      .min(2, "錢包名稱至少需要 2 個字符"),
    address: z
      .string()
      .min(1, "請輸入錢包地址")
      .min(34, "錢包地址長度至少需要 34 個字符")
      .regex(
        /^T[A-Za-z0-9]{33}$/,
        "請輸入有效的 TRON 錢包地址（以 T 開頭，共 34 個字符）"
      ),
    privateKey: z.string().optional(),
  })
  .refine(
    (data) => {
      // 如果是授權合約錢包，私鑰為必填
      if (data.type === SystemWalletType.CONTRACT_EXECUTION) {
        return data.privateKey && data.privateKey.trim().length > 0;
      }
      return true;
    },
    {
      message: "授權合約錢包必須提供私鑰",
      path: ["privateKey"],
    }
  );

type CreateWalletFormData = z.infer<typeof createWalletSchema>;

export default function CreateWalletPage() {
  const navigate = useNavigate();
  const { open } = useNotification();

  // 創建錢包
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

  // 監聽類型變化，用於條件顯示私鑰欄位
  const walletType = watch("type");

  // 提交創建錢包
  const onSubmit = async (data: CreateWalletFormData) => {
    // 構建創建數據
    const createData: any = {
      name: data.name,
      address: data.address,
      type: data.type,
      chain: "tron" as const,
      status: "active" as const,
    };

    // 僅當類型為 CONTRACT_EXECUTION 時才包含私鑰
    if (data.type === SystemWalletType.CONTRACT_EXECUTION && data.privateKey) {
      createData.privateKey = data.privateKey;
    }

    createWallet(
      {
        resource: "system-wallets",
        values: createData,
      },
      {
        onSuccess: () => {
          open?.({
            type: "success",
            message: "創建成功",
            description: "錢包創建成功",
          });
          navigate("/wallets");
        },
        onError: (error: any) => {
          open?.({
            type: "error",
            message: "創建失敗",
            description: error?.message || "創建錢包失敗，請檢查輸入",
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
        <h2 className="text-2xl font-bold">創建錢包</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>錢包資訊</CardTitle>
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
              {/* 錢包類型 */}
              <FormField
                control={control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>錢包類型 *</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="請選擇錢包類型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={SystemWalletType.CONTRACT_EXECUTION}>
                          授權合約錢包
                        </SelectItem>
                        <SelectItem
                          value={SystemWalletType.REVENUE_DISTRIBUTION}
                        >
                          收款錢包
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      授權合約錢包用於執行智能合約，需要提供私鑰
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 錢包名稱 */}
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>錢包名稱 *</FormLabel>
                    <FormControl>
                      <Input placeholder="請輸入錢包名稱" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 錢包地址 */}
              <FormField
                control={control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>錢包地址 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="請輸入 TRON 錢包地址（以 T 開頭，共 34 個字符）"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      TRON 錢包地址格式：以 T 開頭，共 34 個字符
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 私鑰 - 僅當類型為 CONTRACT_EXECUTION 時顯示 */}
              {walletType === SystemWalletType.CONTRACT_EXECUTION && (
                <FormField
                  control={control}
                  name="privateKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>私鑰 *</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="請輸入私鑰"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        授權合約錢包必須提供私鑰，私鑰將被加密存儲
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* 操作按鈕 */}
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
                  {isCreating ? "創建中..." : "創建錢包"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </ListView>
  );
}
