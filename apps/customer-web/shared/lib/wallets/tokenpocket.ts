import { WalletConfig } from '@/shared/types/wallet';

export const tokenpocketConfig: WalletConfig = {
  name: 'TokenPocket',
  buildDeeplink: (targetUrl: string) =>
    `tpdapp://open?params=${encodeURIComponent(JSON.stringify({ url: targetUrl }))}`,
};
