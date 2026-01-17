import { useState, useMemo, useEffect } from "react";
import { useList, useCreate, useUpdate, useDelete, useNotification } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ListView,
  ListViewHeader,
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
  CopyableText,
  TooltipProvider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@saas-platform/ui";
import { Calendar, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { formatDateTime, getTodayStartLocal } from "@saas-platform/utils";
import { useIsMobile } from "@saas-platform/ui";

// RevenueWallet 类型定义
interface RevenueWallet {
  id: string;
  name: string;
  address: string;
  chain: "tron";
  percentage: number;
  isActive: boolean;
  verified: boolean;
  verifiedAt?: Date | string;
  verificationTxHash?: string;
  totalPaidAmount: number;
  lastPaidAt?: Date | string;
  description?: string;
}

// Zod 验证 schema
const walletFormSchema = z.object({
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
  percentage: z
    .number()
    .min(0.01, "分配比例必须大于 0")
    .max(100, "分配比例不能超过 100"),
  description: z.string().optional(),
});

type WalletFormData = z.infer<typeof walletFormSchema>;

// 钱包表单组件
function WalletForm({
  form,
  onSubmit,
  onCancel,
  isLoading,
  title,
}: {
  form: any;
  onSubmit: (data: WalletFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
  title: string;
}) {
  const { control, handleSubmit } = form;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <FormField
                control={control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>地址 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入钱包地址（以 T 开头）" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>分配比例% *</FormLabel>
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
                          field.onChange(e.target.value ? parseFloat(e.target.value) : 0)
                        }
                      />
                    </FormControl>
                    <FormDescription>分配比例范围：0.01 - 100</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入描述（选填）" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "处理中..." : "确定"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function WalletsPage() {
  const isMobile = useIsMobile();
  const { open } = useNotification();

  // 设置页面标题
  useEffect(() => {
    document.title = "收款钱包 - 租户管理后台";
  }, []);

  // 筛选状态
  const [filters, setFilters] = useState({
    name: "",
    createdAt: getTodayStartLocal(),
  });

  // 编辑状态
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [isAddingMode, setIsAddingMode] = useState(false);

  // 构建查询参数
  const queryParams = useMemo(() => {
    const params: any[] = [];
    if (filters.name) {
      params.push({ field: "name", operator: "contains", value: filters.name });
    }
    return params;
  }, [filters.name]);

  // 获取钱包列表
  const walletsQuery = useList<RevenueWallet>({
    resource: "revenue-wallets",
    filters: queryParams,
  });

  const wallets = walletsQuery.result?.data || [];
  const isLoading = walletsQuery.query.isLoading;
  const isError = walletsQuery.query.isError;
  const error = walletsQuery.query.error;

  // 创建钱包
  const createMutation = useCreate<RevenueWallet>();
  const { mutate: createWallet, mutation: createMutationState } = createMutation;

  // 更新钱包
  const updateMutation = useUpdate<RevenueWallet>();
  const { mutate: updateWallet, mutation: updateMutationState } = updateMutation;

  // 删除钱包
  const deleteMutation = useDelete();
  const { mutate: deleteWallet } = deleteMutation;

  // 使用 Refine 的 useForm hook
  const form = useForm<WalletFormData>({
    resolver: zodResolver(walletFormSchema) as any,
    defaultValues: {
      name: "",
      address: "",
      percentage: 0,
      description: "",
    },
  });

  const { reset, setValue } = form;

  // 筛选后的钱包列表
  const filteredWallets = useMemo(() => {
    let filtered = wallets;

    if (filters.name) {
      filtered = filtered.filter((wallet) =>
        wallet.name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    if (filters.createdAt) {
      const filterDate = new Date(filters.createdAt);
      filterDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((wallet) => {
        if (wallet.verifiedAt) {
          const walletDate = new Date(wallet.verifiedAt);
          walletDate.setHours(0, 0, 0, 0);
          return walletDate >= filterDate;
        }
        return true;
      });
    }

    return filtered;
  }, [wallets, filters]);

  // 计算活跃钱包的总比例
  const totalPercentage = useMemo(() => {
    return filteredWallets
      .filter((w) => w.isActive)
      .reduce((sum, w) => sum + w.percentage, 0);
  }, [filteredWallets]);

  // 处理筛选变更
  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  // 处理查询
  const handleSearch = () => {
    walletsQuery.query.refetch();
  };

  // 处理新增钱包
  const handleAddNew = () => {
    setIsAddingMode(true);
    setEditingWalletId(null);
    reset({ name: "", address: "", percentage: 0, description: "" });
  };

  // 处理编辑钱包
  const handleEdit = (wallet: RevenueWallet) => {
    setEditingWalletId(wallet.id);
    setIsAddingMode(false);
    setValue("name", wallet.name);
    setValue("address", wallet.address);
    setValue("percentage", wallet.percentage);
    setValue("description", wallet.description || "");
  };

  // 处理取消编辑
  const handleCancel = () => {
    setIsAddingMode(false);
    setEditingWalletId(null);
    reset({ name: "", address: "", percentage: 0, description: "" });
  };

  // 处理提交表单
  const onSubmit = (data: WalletFormData) => {
    if (isAddingMode || !editingWalletId) {
      createWallet(
        {
          resource: "revenue-wallets",
          values: {
            name: data.name,
            address: data.address,
            percentage: data.percentage,
            description: data.description || undefined,
            isActive: true,
          },
          errorNotification: false,
        },
        {
          onSuccess: () => {
            handleCancel();
            walletsQuery.query.refetch();
          },
          onError: (error: any) => {
            open?.({
              type: "error",
              message: "创建失败",
              description:
                error?.response?.data?.message || error?.message || "未知错误",
            });
          },
        }
      );
    } else {
      updateWallet(
        {
          resource: "revenue-wallets",
          id: editingWalletId,
          values: {
            name: data.name,
            address: data.address,
            percentage: data.percentage,
            description: data.description || undefined,
          },
          errorNotification: false,
        },
        {
          onSuccess: () => {
            handleCancel();
            walletsQuery.query.refetch();
          },
          onError: (error: any) => {
            open?.({
              type: "error",
              message: "更新失败",
              description:
                error?.response?.data?.message || error?.message || "未知错误",
            });
          },
        }
      );
    }
  };

  // 处理删除钱包
  const handleDelete = (walletId: string) => {
    if (!confirm("确定要删除此钱包吗？")) return;

    deleteWallet(
      { resource: "revenue-wallets", id: walletId, errorNotification: false },
      {
        onSuccess: () => walletsQuery.query.refetch(),
        onError: (error: any) => {
          open?.({
            type: "error",
            message: "删除失败",
            description:
              error?.response?.data?.message || error?.message || "未知错误",
          });
        },
      }
    );
  };

  const isFormLoading = createMutationState.isPending || updateMutationState.isPending;

  // 渲染移动端卡片
  const renderMobileCard = (wallet: RevenueWallet) => {
    const isEditing = editingWalletId === wallet.id;

    if (isEditing) {
      return (
        <WalletForm
          key={wallet.id}
          form={form}
          onSubmit={onSubmit}
          onCancel={handleCancel}
          isLoading={isFormLoading}
          title="编辑钱包"
        />
      );
    }

    return (
      <Card key={wallet.id}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">{wallet.name}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleEdit(wallet)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDelete(wallet.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">地址</span>
              <CopyableText text={wallet.address} textSize="xs" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">分配比例</span>
              <span>{wallet.percentage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">建立时间</span>
              <span>{wallet.verifiedAt ? formatDateTime(wallet.verifiedAt) : "-"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">状态</span>
              <div className="flex gap-2">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    wallet.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {wallet.isActive ? "启用" : "停用"}
                </span>
                {wallet.verified && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    已验证
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <TooltipProvider>
      <ListView>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <ListViewHeader title="钱包列表" />
          <Button onClick={handleAddNew} disabled={isLoading || isAddingMode} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            新增
          </Button>
        </div>

        {/* 筛选区域 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>筛选条件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">建立时间</label>
                <div className="relative">
                  <Input
                    type="datetime-local"
                    placeholder="请选择时间"
                    value={filters.createdAt}
                    onChange={(e) => handleFilterChange("createdAt", e.target.value)}
                    className="pr-10"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">名称</label>
                <Input
                  placeholder="请输入名称"
                  value={filters.name}
                  onChange={(e) => handleFilterChange("name", e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={isLoading} className="w-full">
                  <Search className="w-4 h-4 mr-2" />
                  查詢
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 错误提示 */}
        {isError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-6">
            {error?.message || "获取钱包列表失败"}
          </div>
        )}

        {/* 载入状态 */}
        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">载入中...</div>
        )}

        {/* 钱包列表 */}
        {!isLoading && (
          <>
            {/* 新增表单 */}
            {isAddingMode && (
              <WalletForm
                form={form}
                onSubmit={onSubmit}
                onCancel={handleCancel}
                isLoading={isFormLoading}
                title="新增钱包"
              />
            )}

            {filteredWallets.length > 0 ? (
              isMobile ? (
                // 移动端卡片视图
                <div className="space-y-3">
                  {filteredWallets.map((wallet) => renderMobileCard(wallet))}
                </div>
              ) : (
                // 桌面端表格视图
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">钱包名称</TableHead>
                            <TableHead className="whitespace-nowrap">地址</TableHead>
                            <TableHead className="whitespace-nowrap">分配比例%</TableHead>
                            <TableHead className="whitespace-nowrap">建立时间</TableHead>
                            <TableHead className="whitespace-nowrap">状态</TableHead>
                            <TableHead className="whitespace-nowrap">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredWallets.map((wallet) => {
                            const isEditing = editingWalletId === wallet.id;

                            if (isEditing) {
                              return (
                                <TableRow key={wallet.id}>
                                  <TableCell colSpan={6} className="p-4">
                                    <Form {...(form as any)}>
                                      <form
                                        onSubmit={form.handleSubmit(onSubmit as any) as any}
                                        className="space-y-4"
                                      >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <FormField
                                            control={form.control}
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
                                          <FormField
                                            control={form.control}
                                            name="address"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>地址 *</FormLabel>
                                                <FormControl>
                                                  <Input placeholder="请输入钱包地址（以 T 开头）" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          <FormField
                                            control={form.control}
                                            name="percentage"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>分配比例% *</FormLabel>
                                                <FormControl>
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
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
                                          <FormField
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>描述</FormLabel>
                                                <FormControl>
                                                  <Input placeholder="请输入描述（选填）" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                          <Button type="button" variant="outline" onClick={handleCancel}>
                                            取消
                                          </Button>
                                          <Button type="submit" disabled={isFormLoading}>
                                            {isFormLoading ? "处理中..." : "确定"}
                                          </Button>
                                        </div>
                                      </form>
                                    </Form>
                                  </TableCell>
                                </TableRow>
                              );
                            }

                            return (
                              <TableRow key={wallet.id}>
                                <TableCell>{wallet.name}</TableCell>
                                <TableCell>
                                  <CopyableText text={wallet.address} />
                                </TableCell>
                                <TableCell>{wallet.percentage}%</TableCell>
                                <TableCell>
                                  {wallet.verifiedAt ? formatDateTime(wallet.verifiedAt) : "-"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        wallet.isActive
                                          ? "bg-green-100 text-green-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {wallet.isActive ? "启用" : "停用"}
                                    </span>
                                    {wallet.verified && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        已验证
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => handleEdit(wallet)}>
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleDelete(wallet.id)}>
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  暂无钱包数据
                </CardContent>
              </Card>
            )}

            {/* 总比例显示 */}
            {filteredWallets.length > 0 && (
              <Card className="mt-4">
                <CardContent className="pt-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm font-medium">启用钱包总比例：</span>
                    <span
                      className={`text-lg font-bold ${
                        totalPercentage === 100 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {totalPercentage.toFixed(2)}%
                    </span>
                    {totalPercentage !== 100 && (
                      <span className="text-sm text-destructive">
                        * 启用钱包的分配比例总和必须为 100%
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </ListView>
    </TooltipProvider>
  );
}
