'use client';

import { TenantPageProps } from '@/shared/types';

export function SuccessPage(_props: TenantPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-white"
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

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          授权成功！
        </h1>

        <p className="text-gray-600 mb-8">
          您的投资账户已成功注册，现在可以开始投资了。
        </p>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            请返回您的投资平台继续操作
          </p>
        </div>
      </div>
    </div>
  );
}
