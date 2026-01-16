import { useState, useEffect } from "react";
import { useOne, useUpdate } from "@refinedev/core";
import {
  ListView,
  ListViewHeader,
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CopyableText,
  TooltipProvider,
} from "@saas-platform/ui";
import { Wallet, CheckCircle2, XCircle, AlertCircle, Save } from "lucide-react";
import { formatDateTimeLocalized } from "@saas-platform/utils";

// AgentWallet 类型定义
interface AgentWallet {
  address: string;
  chain: "tron";
  verified: boolean;
  verifiedAt?: Date | string;
  verificationTxHash?: string;
  lastPaidAt?: Date | string;
  totalPaidAmount: number;
}

interface AgentInfo {
  id: number;
  name: string;
  code: string;
  wallet?: AgentWallet;
}

export default function WalletPage() {
  // 设置页面标题
  useEffect(() => {
    document.title = "收款钱包 - 代理商后台";
  }, []);

  const [walletAddress, setWalletAddress] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取当前代理信息 - 使用标准 useOne hook
  const { query, result: agentInfo } = useOne<AgentInfo>({
    resource: "agents",
    id: "me",
  });

  const { isLoading, isError, refetch } = query;

  // 更新钱包地址 - 使用标准 useUpdate hook
  const { mutate: updateWallet, mutation: updateMutation } = useUpdate<AgentInfo>();

  // 当获取到代理信息时，设置钱包地址
  useEffect(() => {
    if (agentInfo?.wallet?.address) {
      setWalletAddress(agentInfo.wallet.address);
    }
  }, [agentInfo]);

  // 处理编辑
  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  // 处理取消
  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    // 恢复原始地址
    if (agentInfo?.wallet?.address) {
      setWalletAddress(agentInfo.wallet.address);
    } else {
      setWalletAddress("");
    }
  };

  // 处理保存
  const handleSave = () => {
    // 验证地址格式
    if (!walletAddress.trim()) {
      setError("请输入钱包地址");
      return;
    }

    // TRON 地址格式验证（T 开头，34 个字符）
    const tronAddressRegex = /^T[A-Za-z1-9]{33}$/;
    if (!tronAddressRegex.test(walletAddress.trim())) {
      setError("无效的 TRON 地址格式（应为 T 开头，34 个字符）");
      return;
    }

    setError(null);

    updateWallet(
      {
        resource: "agents",
        id: "me/wallet",
        values: {
          walletAddress: walletAddress.trim(),
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          setError(null);
          // 刷新代理信息
          refetch();
        },
        onError: (error: any) => {
          setError(
            error?.response?.data?.message ||
              error?.message ||
              "更新失败，请稍后再试"
          );
        },
      }
    );
  };

  return (
    <TooltipProvider>
      <ListView>
        <ListViewHeader title="收款钱包" />

        {isError && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  获取钱包信息失败，请稍后再试
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              加载中...
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>收款钱包设置</CardTitle>
              <CardDescription>
                设置您的 TRON 钱包地址以接收佣金分润
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 钱包地址输入 */}
              <div className="space-y-2">
                <Label htmlFor="wallet-address">TRON 钱包地址 *</Label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="wallet-address"
                      type="text"
                      placeholder="请输入 TRON 钱包地址（T 开头，34 个字符）"
                      value={walletAddress}
                      onChange={(e) => {
                        setWalletAddress(e.target.value);
                        setError(null);
                      }}
                      disabled={!isEditing || updateMutation.isPending}
                      className="pl-10 font-mono"
                    />
                  </div>
                  {!isEditing ? (
                    <Button onClick={handleEdit} variant="outline" className="w-full sm:w-auto">
                      编辑
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="flex-1 sm:flex-initial"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateMutation.isPending ? "保存中..." : "保存"}
                      </Button>
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        disabled={updateMutation.isPending}
                        className="flex-1 sm:flex-initial"
                      >
                        取消
                      </Button>
                    </div>
                  )}
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  请确保输入正确的 TRON 钱包地址，地址将在第一次收到分润时自动验证
                </p>
              </div>

              {/* 钱包状态信息 */}
              {agentInfo?.wallet && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <h3 className="text-sm font-medium mb-3">钱包状态</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 验证状态 */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          验证状态：
                        </span>
                        {agentInfo.wallet.verified ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm font-medium">已验证</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-orange-600">
                            <XCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">未验证</span>
                          </div>
                        )}
                      </div>

                      {/* 验证时间 */}
                      {agentInfo.wallet.verifiedAt && (
                        <div>
                          <span className="text-sm text-muted-foreground">
                            验证时间：
                          </span>
                          <span className="text-sm ml-2">
                            {formatDateTimeLocalized(agentInfo.wallet.verifiedAt)}
                          </span>
                        </div>
                      )}

                      {/* 最后分润时间 */}
                      {agentInfo.wallet.lastPaidAt && (
                        <div>
                          <span className="text-sm text-muted-foreground">
                            最后分润时间：
                          </span>
                          <span className="text-sm ml-2">
                            {formatDateTimeLocalized(agentInfo.wallet.lastPaidAt)}
                          </span>
                        </div>
                      )}

                      {/* 累计分润金额 */}
                      <div>
                        <span className="text-sm text-muted-foreground">
                          累计分润金额：
                        </span>
                        <span className="text-sm font-medium ml-2">
                          {agentInfo.wallet.totalPaidAmount.toLocaleString(
                            "zh-TW",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}{" "}
                          USDT
                        </span>
                      </div>

                      {/* 验证交易 Hash */}
                      {agentInfo.wallet.verificationTxHash && (
                        <div className="sm:col-span-2">
                          <span className="text-sm text-muted-foreground">
                            验证交易 Hash：
                          </span>
                          <span className="ml-2">
                            <CopyableText
                              text={agentInfo.wallet.verificationTxHash}
                              textSize="sm"
                            />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 重要提示 */}
                  {!agentInfo.wallet.verified && (
                    <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-orange-900">
                            钱包尚未验证
                          </p>
                          <p className="text-sm text-orange-700 mt-1">
                            您的钱包地址将在第一次收到佣金分润时自动验证。请确保地址正确，否则可能无法收到分润。
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 如果还没有设置钱包 */}
              {!agentInfo?.wallet && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">
                        尚未设置收款钱包
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        请先设置您的 TRON 钱包地址，以便接收佣金分润。钱包地址将在第一次收到分润时自动验证。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </ListView>
    </TooltipProvider>
  );
}
