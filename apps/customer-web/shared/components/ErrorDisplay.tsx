import { AppError, errorMessages } from '@/shared/lib/errors';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-800 mb-2">
        {errorMessages[error.code] || error.message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          重試
        </button>
      )}
    </div>
  );
}
