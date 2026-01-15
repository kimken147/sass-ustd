import { AppError } from '../lib/errors';

export type WalletType = 'tronlink' | 'imtoken' | 'tokenpocket';

export interface WalletConfig {
  name: string;
  buildDeeplink: (targetUrl: string) => string;
}

export interface WalletState {
  isReady: boolean;
  isConnected: boolean;
  address: string | null;
  error: AppError | null;
}

export interface ApproveState {
  isLoading: boolean;
  error: AppError | null;
  txHash: string | null;
}
