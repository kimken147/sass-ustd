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
        {/* 成功图示 */}
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

        {/* 成功讯息 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            账户开通成功
          </h1>
          <p className="text-gray-600">
            感谢您选择我们的专业理财服务
          </p>
        </div>

        {/* 下一步说明 */}
        <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">接下来的步骤</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>专业团队将开始为您管理资产</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>您可以随时查看投资收益</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>如需赎回请联系客服团队</span>
            </li>
          </ul>
        </div>

        {/* 投资账户 */}
        {address && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">您的投资账户</p>
            <p className="text-sm font-mono text-gray-900 break-all">
              {address}
            </p>
          </div>
        )}

        {/* 返回首页按钮 */}
        <button
          onClick={handleReturnHome}
          className="w-full py-3 px-6 bg-blue-800 hover:bg-blue-900 text-white font-medium rounded-lg transition-colors"
        >
          返回首页
        </button>
      </div>
    </div>
  );
}
