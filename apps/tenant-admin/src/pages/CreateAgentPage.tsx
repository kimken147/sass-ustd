import { useMemo, useEffect } from "react";
import { useCreate, useList, useNavigation } from "@refinedev/core";
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

// Zod 验证 schema
const agentFormSchema = z.object({
  name: z
    .string()
    .min(1, "请输入代理名称")
    .min(2, "代理名称至少需要 2 个字符"),
  username: z
    .string()
    .min(1, "请输入账号")
    .min(3, "账号至少需要 3 个字符"),
  email: z
    .string()
    .email("请输入有效的 Email 格式")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(1, "请输入密码")
    .min(6, "密码至少需要 6 个字符"),
  parentAgentId: z.string().optional(),
  uplineRate: z
    .number()
    .min(0, "分润比例不能小于 0")
    .max(100, "分润比例不能超过 100"),
  walletAddress: z
    .string()
    .min(1, "请输入钱包地址")
    .min(34, "钱包地址长度至少需要 34 个字符")
    .regex(
      /^T[A-Za-z0-9]{33}$/,
      "请输入有效的 TRON 钱包地址（以 T 开头，共 34 个字符）"
    ),
});

type AgentFormData = z.infer<typeof agentFormSchema>;

export default function CreateAgentPage() {
  // 设置页面标题
  useEffect(() => {
    document.title = "创建代理 - 租户管理后台";
  }, []);

  const { list } = useNavigation();
  const createMutation = useCreate();
  const { mutate: createAgent, mutation } = createMutation;
  const isCreating = mutation.isPending || false;

  // 获取代理列表（用于选择上级代理）
  const agentsQuery = useList<Agent>({
    resource: "agents",
    filters: [],
  });

  const agents = agentsQuery.result?.data || [];

  // 使用 Refine 的 useForm hook 进行表单管理
  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentFormSchema) as any,
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      parentAgentId: "none",
      uplineRate: 0,
      walletAddress: "",
    },
  });

  const { control, handleSubmit } = form;

  // 提交表单
  const onSubmit = (data: AgentFormData) => {
    // 构建创建代理的数据
    const createData: any = {
      name: data.name,
      username: data.username,
      password: data.password,
      uplineRate: data.uplineRate,
      walletAddress: data.walletAddress,
    };

    // 只有当 email 有值时才添加
    if (data.email) {
      createData.email = data.email;
    }

    // 只有当选择了上级代理时才添加
    if (data.parentAgentId && data.parentAgentId !== "none") {
      createData.parentAgentId = parseInt(data.parentAgentId);
    }

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
          console.error("创建代理失败:", error);
          alert(
            error?.response?.data?.message ||
              error?.message ||
              "创建代理失败"
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

              {/* Email */}
              <FormField
                control={control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="请输入 Email（选填）"
                        {...field}
                      />
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

              {/* 上级代理 */}
              <FormField
                control={control}
                name="parentAgentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>上级代理</FormLabel>
                    <Select
                      value={field.value || "none"}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择上级代理" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">
                          无（预设上级为站长）
                        </SelectItem>
                        {agents.map((agent: Agent) => (
                          <SelectItem
                            key={agent.id}
                            value={agent.id.toString()}
                          >
                            {agent.name} (层级: {agent.level})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 分润（上级比率） */}
              <FormField
                control={control}
                name="uplineRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      分润 <span className="text-destructive">*</span>
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
                    <FormDescription>分润比例范围：0 - 100</FormDescription>
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
