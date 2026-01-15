import { Suspense } from 'react';
import RedirectClient from './redirect-client';
import { LoadingSpinner } from '@/shared/components';

export default function RedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600 mb-4">載入中...</p>
          </div>
        </div>
      }
    >
      <RedirectClient />
    </Suspense>
  );
}
