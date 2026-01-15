import { useEffect } from "react";
import { useCreate, useNavigation } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreateView, CreateViewHeader } from "@saas-platform/ui";
import { Button } from "@saas-platform/ui";
import { Input } from "@saas-platform/ui";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@saas-platform/ui";
import { Card, CardContent } from "@saas-platform/ui";

// Zod 驗證 schema
const subAgentFormSchema = z.object({
  name: z.string().min(1, "請輸入代理名稱").min(2, "代理名稱至少需要 2 個字符"),
  username: z.string().min(1, "請輸入帳號").min(3, "帳號至少需要 3 個字符"),
  password: z.string().min(1, "請輸入密碼").min(6, "密碼至少需要 6 個字符"),
  uplineRate: z
    .number()
    .min(0, "分潤比例不能小於 0")
    .max(100, "分潤比例不能超過 100"),
  walletAddress: z
    .string()
    .min(1, "請輸入錢包地址")
    .min(34, "錢包地址長度至少需要 34 個字符")
    .regex(
      /^T[A-Za-z0-9]{33}$/,
      "請輸入有效的 TRON 錢包地址（以 T 開頭，共 34 個字符）"
    ),
  notes: z.string().optional().or(z.literal("")),
});

type SubAgentFormData = z.infer<typeof subAgentFormSchema>;

export default function CreateSubAgentPage() {
  // 設置頁面標題
  useEffect(() => {
    document.title = "創建下級代理 - 代理商後台";
  }, []);

  const { list } = useNavigation();
  const createMutation = useCreate();
  const { mutate: createSubAgent, mutation } = createMutation;
  const isCreating = mutation.isPending || false;

  // 使用 Refine 的 useForm hook 進行表單管理
  const form = useForm<SubAgentFormData>({
    resolver: zodResolver(subAgentFormSchema) as any,
    defaultValues: {
      name: "",
      username: "",
      password: "",
      uplineRate: 0,
      walletAddress: "",
      notes: "",
    },
  });

  const { control, handleSubmit } = form;

  // 提交表單
  const onSubmit = (data: SubAgentFormData) => {
    // 構建創建下級代理的數據
    const createData: any = {
      name: data.name,
      username: data.username,
      password: data.password,
      uplineRate: data.uplineRate,
      walletAddress: data.walletAddress,
    };

    // 只有當 notes 有值時才添加
    if (data.notes) {
      createData.notes = data.notes;
    }

    createSubAgent(
      {
        resource: "sub-agents",
        values: createData,
      },
      {
        onSuccess: () => {
          list("sub-agents");
        },
        onError: (error: any) => {
          console.error("創建下級代理失敗:", error);
          alert(
            error?.response?.data?.message ||
              error?.message ||
              "創建下級代理失敗"
          );
        },
      }
    );
  };

  const handleCancel = () => {
    list("sub-agents");
  };

  return (
    <CreateView>
      <CreateViewHeader title="新增下級" />

      <Form {...(form as any)}>
        <form onSubmit={handleSubmit(onSubmit as any) as any}>
          <Card>
            <CardContent className="space-y-4 pt-6">
              {/* 代理名稱 */}
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      代理名稱 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="請輸入代理名稱" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 帳號 */}
              <FormField
                control={control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      帳號 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="請輸入帳號" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 密碼 */}
              <FormField
                control={control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      密碼 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="請輸入密碼"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 地址（錢包地址） */}
              <FormField
                control={control}
                name="walletAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      地址 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="請輸入 TRON 錢包地址（以 T 開頭）"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 分潤（上級比率） */}
              <FormField
                control={control}
                name="uplineRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      分潤 <span className="text-destructive">*</span>
                    </FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="請輸入比例"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : 0
                            )
                          }
                          className="flex-1"
                        />
                      </FormControl>
                      <span className="text-muted-foreground">%</span>
                    </div>
                    <FormDescription>
                      上級比率：給上級代理的佣金比例（自己保留 = 100% -
                      上級比率）
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 備註 */}
              <FormField
                control={control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>備註</FormLabel>
                    <FormControl>
                      <Input placeholder="請輸入備註（選填）" {...field} />
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
              disabled={isCreating}
            >
              取消
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "建立中..." : "完成"}
            </Button>
          </div>
        </form>
      </Form>
    </CreateView>
  );
}
