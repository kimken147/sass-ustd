import { WalletType, WalletConfig } from '@/shared/types/wallet';
import { tronlinkConfig } from './tronlink';
import { imtokenConfig } from './imtoken';
import { tokenpocketConfig } from './tokenpocket';
import { bitpieConfig } from './bitpie';

export const walletConfigs: Record<WalletType, WalletConfig> = {
  tronlink: tronlinkConfig,
  imtoken: imtokenConfig,
  tokenpocket: tokenpocketConfig,
  bitpie: bitpieConfig,
};

export function getWalletConfig(walletType: WalletType): WalletConfig | null {
  return walletConfigs[walletType] || null;
}

export function buildWalletDeeplink(walletType: WalletType, targetUrl: string): string | null {
  const config = getWalletConfig(walletType);
  return config ? config.buildDeeplink(targetUrl) : null;
}
