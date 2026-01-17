import { useEffect } from "react";
import { useCreate, useNavigation, useNotification } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CreateView,
  CreateViewHeader,
  Button,
  Input,
  Card,
  CardContent,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@saas-platform/ui";

// Zod 验证 schema
const subAgentFormSchema = z.object({
  name: z.string().min(1, "请输入代理名称").min(2, "代理名称至少需要 2 个字符"),
  username: z.string().min(1, "请输入账号").min(3, "账号至少需要 3 个字符"),
  password: z.string().min(1, "请输入密码").min(6, "密码至少需要 6 个字符"),
  allocatedRate: z
    .number()
    .min(0, "分配比率不能小于 0")
    .max(100, "分配比率不能超过 100"),
  walletAddress: z
    .string()
    .min(1, "请输入钱包地址")
    .min(34, "钱包地址长度至少需要 34 个字符")
    .regex(
      /^T[A-Za-z0-9]{33}$/,
      "请输入有效的 TRON 钱包地址（以 T 开头，共 34 个字符）"
    ),
  notes: z.string().optional().or(z.literal("")),
});

type SubAgentFormData = z.infer<typeof subAgentFormSchema>;

export default function CreateSubAgentPage() {
  // 设置页面标题
  useEffect(() => {
    document.title = "创建下级代理 - 代理商后台";
  }, []);

  const { list } = useNavigation();
  const { open } = useNotification();
  const createMutation = useCreate();
  const { mutate: createSubAgent, mutation } = createMutation;
  const isCreating = mutation.isPending || false;

  // 使用 Refine 的 useForm hook 进行表单管理
  const form = useForm<SubAgentFormData>({
    resolver: zodResolver(subAgentFormSchema) as any,
    defaultValues: {
      name: "",
      username: "",
      password: "",
      allocatedRate: 0,
      walletAddress: "",
      notes: "",
    },
  });

  const { control, handleSubmit } = form;

  // 提交表单
  const onSubmit = (data: SubAgentFormData) => {
    // 构建创建下级代理的数据
    const createData: any = {
      name: data.name,
      username: data.username,
      password: data.password,
      allocatedRate: data.allocatedRate,
      walletAddress: data.walletAddress,
    };

    // 只有当 notes 有值时才添加
    if (data.notes) {
      createData.notes = data.notes;
    }

    createSubAgent(
      {
        resource: "sub-agents",
        values: createData,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          list("sub-agents");
        },
        onError: (error: any) => {
          open?.({
            type: "error",
            message: "创建失败",
            description:
              error?.response?.data?.message ||
              error?.message ||
              "创建下级代理失败",
          });
        },
      }
    );
  };

  const handleCancel = () => {
    list("sub-agents");
  };

  return (
    <CreateView>
      <CreateViewHeader title="新增下级" />

      <Form {...(form as any)}>
        <form onSubmit={handleSubmit(onSubmit as any) as any}>
          <Card>
            <CardContent className="space-y-4 pt-6">
              {/* 代理名称 */}
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      代理名称 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入代理名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 账号 */}
              <FormField
                control={control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      账号 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入账号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 密码 */}
              <FormField
                control={control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      密码 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="请输入密码"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 地址（钱包地址） */}
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
                        placeholder="请输入 TRON 钱包地址（以 T 开头）"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 分配比率 */}
              <FormField
                control={control}
                name="allocatedRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      分配比率 <span className="text-destructive">*</span>
                    </FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="请输入比例"
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
                      分配给该代理的全局比率，相对于总投资金额（0 - 100%）
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 备注 */}
              <FormField
                control={control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>备注</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入备注（选填）" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isCreating}
              className="w-full sm:w-auto"
            >
              取消
            </Button>
            <Button type="submit" disabled={isCreating} className="w-full sm:w-auto">
              {isCreating ? "建立中..." : "完成"}
            </Button>
          </div>
        </form>
      </Form>
    </CreateView>
  );
}
