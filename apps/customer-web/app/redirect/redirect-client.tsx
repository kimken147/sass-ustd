'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { buildWalletDeeplink, getWalletConfig } from '@/shared/lib/wallets';
import { saveReferralCode } from '@/shared/lib/storage';
import { WalletType } from '@/shared/types/wallet';
import { LoadingSpinner } from '@/shared/components';

export default function RedirectClient() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [deeplink, setDeeplink] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [walletName, setWalletName] = useState<string>('');

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

    const config = getWalletConfig(wallet);
    if (!config) {
      setError('不支持的钱包类型');
      return;
    }

    setWalletName(config.name);

    // Build deeplink — pass ref in targetUrl so it's available in wallet's DApp browser
    // (wallet DApp browser has separate localStorage, can't read what we saved above)
    const origin = window.location.origin;
    const url = ref ? `${origin}?ref=${encodeURIComponent(ref)}` : origin;
    setTargetUrl(url);

    const deeplinkUrl = buildWalletDeeplink(wallet, url);
    if (!deeplinkUrl) {
      setError('不支持的钱包类型');
      return;
    }

    setDeeplink(deeplinkUrl);

    // Auto redirect
    window.location.href = deeplinkUrl;

    // Show fallback after 3 seconds (deeplink may have failed to open DApp browser)
    const timer = setTimeout(() => {
      setShowFallback(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const handleManualOpen = () => {
    if (deeplink) {
      window.location.href = deeplink;
    }
  };

  const handleCopyUrl = useCallback(async () => {
    if (!targetUrl) return;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = targetUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [targetUrl]);

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-sm w-full">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600 mb-4">正在打开钱包...</p>
        {showFallback && (
          <div className="space-y-3">
            <button
              onClick={handleManualOpen}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              重新打开{walletName}
            </button>

            <div className="border-t border-gray-200 pt-3">
              <p className="text-sm text-gray-500 mb-2">
                如果{walletName}已打开但未显示页面，请复制以下链接，在{walletName}的 DApp 浏览器中手动打开：
              </p>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
                <span className="text-xs text-gray-700 truncate flex-1 text-left">
                  {targetUrl}
                </span>
                <button
                  onClick={handleCopyUrl}
                  className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
