'use client';

import { useRouter } from 'next/navigation';
import { TenantPageProps } from '@/shared/types';
import { useWallet } from '@/shared/hooks';

export function SuccessPage(_props: TenantPageProps) {
  const router = useRouter();
  const { address } = useWallet();

  const handleReturnHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-xl p-8">
        {/* 成功圖示 */}
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* 成功訊息 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            帳戶開通成功
          </h1>
          <p className="text-gray-600">
            感謝您選擇我們的專業理財服務
          </p>
        </div>

        {/* 下一步說明 */}
        <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">接下來的步驟</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>專業團隊將開始為您管理資產</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>您可以隨時查看投資收益</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>如需贖回請聯繫客服團隊</span>
            </li>
          </ul>
        </div>

        {/* 投資帳戶 */}
        {address && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">您的投資帳戶</p>
            <p className="text-sm font-mono text-gray-900 break-all">
              {address}
            </p>
          </div>
        )}

        {/* 返回首頁按鈕 */}
        <button
          onClick={handleReturnHome}
          className="w-full py-3 px-6 bg-blue-800 hover:bg-blue-900 text-white font-medium rounded-lg transition-colors"
        >
          返回首頁
        </button>
      </div>
    </div>
  );
}
