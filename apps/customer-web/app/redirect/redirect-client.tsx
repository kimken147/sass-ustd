'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { buildWalletDeeplink } from '@/shared/lib/wallets';
import { saveReferralCode } from '@/shared/lib/storage';
import { WalletType } from '@/shared/types/wallet';
import { LoadingSpinner } from '@/shared/components';

export default function RedirectClient() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [showManualButton, setShowManualButton] = useState(false);
  const [deeplink, setDeeplink] = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get('ref');
    const wallet = searchParams.get('wallet') as WalletType;

    // Save referral code
    if (ref) {
      saveReferralCode(ref);
    }

    if (!wallet) {
      setError('缺少钱包参数');
      return;
    }

    // Build deeplink
    const targetUrl = window.location.origin;
    const deeplinkUrl = buildWalletDeeplink(wallet, targetUrl);

    if (!deeplinkUrl) {
      setError('不支持的钱包类型');
      return;
    }

    setDeeplink(deeplinkUrl);

    // Auto redirect
    window.location.href = deeplinkUrl;

    // Show manual button after 3 seconds
    const timer = setTimeout(() => {
      setShowManualButton(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const handleManualOpen = () => {
    if (deeplink) {
      window.location.href = deeplink;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600 mb-4">正在打开钱包...</p>
        {showManualButton && (
          <button
            onClick={handleManualOpen}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            手动打开钱包
          </button>
        )}
      </div>
    </div>
  );
}
