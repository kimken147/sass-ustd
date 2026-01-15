import { useState, useEffect } from "react";
import { useOne, useUpdate } from "@refinedev/core";
import { ListView, ListViewHeader } from "@saas-platform/ui";
import { Button } from "@saas-platform/ui";
import { Input } from "@saas-platform/ui";
import { Label } from "@saas-platform/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@saas-platform/ui";
import { Wallet, CheckCircle2, XCircle, AlertCircle, Save } from "lucide-react";
import { formatDateTimeLocalized } from "@saas-platform/utils";

// AgentWallet 類型定義
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
  const [walletAddress, setWalletAddress] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 獲取當前代理信息 - 使用標準 useOne hook
  // 通過 resource="agents" 和 id="me" 來訪問 /api/agents/me
  const { query, result: agentInfo } = useOne<AgentInfo>({
    resource: "agents",
    id: "me",
  });

  const { isLoading, isError, refetch } = query;

  // 更新錢包地址 - 使用標準 useUpdate hook
  // 通過 resource="agents" 和 id="me/wallet" 來訪問 /api/agents/me/wallet
  const { mutate: updateWallet, mutation: updateMutation } = useUpdate<AgentInfo>();

  // 當獲取到代理信息時，設置錢包地址
  useEffect(() => {
    if (agentInfo?.wallet?.address) {
      setWalletAddress(agentInfo.wallet.address);
    }
  }, [agentInfo]);

  // 處理編輯
  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  // 處理取消
  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    // 恢復原始地址
    if (agentInfo?.wallet?.address) {
      setWalletAddress(agentInfo.wallet.address);
    } else {
      setWalletAddress("");
    }
  };

  // 處理保存
  const handleSave = () => {
    // 驗證地址格式
    if (!walletAddress.trim()) {
      setError("請輸入錢包地址");
      return;
    }

    // TRON 地址格式驗證（T 開頭，34 個字符）
    const tronAddressRegex = /^T[A-Za-z1-9]{33}$/;
    if (!tronAddressRegex.test(walletAddress.trim())) {
      setError("無效的 TRON 地址格式（應為 T 開頭，34 個字符）");
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
              "更新失敗，請稍後再試"
          );
        },
      }
    );
  };

  return (
    <ListView>
      <ListViewHeader title="收款錢包" />

      {isError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                獲取錢包信息失敗，請稍後再試
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            載入中...
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>收款錢包設置</CardTitle>
            <CardDescription>
              設置您的 TRON 錢包地址以接收佣金分潤
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 錢包地址輸入 */}
            <div className="space-y-2">
              <Label htmlFor="wallet-address">TRON 錢包地址 *</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="wallet-address"
                    type="text"
                    placeholder="請輸入 TRON 錢包地址（T 開頭，34 個字符）"
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
                  <Button onClick={handleEdit} variant="outline">
                    編輯
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateMutation.isPending ? "保存中..." : "保存"}
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      disabled={updateMutation.isPending}
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
                請確保輸入正確的 TRON 錢包地址，地址將在第一次收到分潤時自動驗證
              </p>
            </div>

            {/* 錢包狀態信息 */}
            {agentInfo?.wallet && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <h3 className="text-sm font-medium mb-3">錢包狀態</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 驗證狀態 */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        驗證狀態：
                      </span>
                      {agentInfo.wallet.verified ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-sm font-medium">已驗證</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-orange-600">
                          <XCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">未驗證</span>
                        </div>
                      )}
                    </div>

                    {/* 驗證時間 */}
                    {agentInfo.wallet.verifiedAt && (
                      <div>
                        <span className="text-sm text-muted-foreground">
                          驗證時間：
                        </span>
                        <span className="text-sm ml-2">
                          {formatDateTimeLocalized(agentInfo.wallet.verifiedAt)}
                        </span>
                      </div>
                    )}

                    {/* 最後分潤時間 */}
                    {agentInfo.wallet.lastPaidAt && (
                      <div>
                        <span className="text-sm text-muted-foreground">
                          最後分潤時間：
                        </span>
                        <span className="text-sm ml-2">
                          {formatDateTimeLocalized(agentInfo.wallet.lastPaidAt)}
                        </span>
                      </div>
                    )}

                    {/* 累計分潤金額 */}
                    <div>
                      <span className="text-sm text-muted-foreground">
                        累計分潤金額：
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

                    {/* 驗證交易 Hash */}
                    {agentInfo.wallet.verificationTxHash && (
                      <div className="md:col-span-2">
                        <span className="text-sm text-muted-foreground">
                          驗證交易 Hash：
                        </span>
                        <span className="text-sm font-mono ml-2">
                          {agentInfo.wallet.verificationTxHash}
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
                          錢包尚未驗證
                        </p>
                        <p className="text-sm text-orange-700 mt-1">
                          您的錢包地址將在第一次收到佣金分潤時自動驗證。請確保地址正確，否則可能無法收到分潤。
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 如果還沒有設置錢包 */}
            {!agentInfo?.wallet && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      尚未設置收款錢包
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      請先設置您的 TRON 錢包地址，以便接收佣金分潤。錢包地址將在第一次收到分潤時自動驗證。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </ListView>
  );
}
