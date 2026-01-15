import { LoadingSpinner } from './LoadingSpinner';

interface WalletButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function WalletButton({
  onClick,
  loading = false,
  disabled = false,
  children,
  className = '',
}: WalletButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${className}`}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  );
}
