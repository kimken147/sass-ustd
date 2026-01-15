import { WalletConfig } from '@/shared/types/wallet';

export const imtokenConfig: WalletConfig = {
  name: 'imToken',
  buildDeeplink: (targetUrl: string) =>
    `imtokenv2://navigate?screen=DappView&url=${encodeURIComponent(targetUrl)}`,
};
