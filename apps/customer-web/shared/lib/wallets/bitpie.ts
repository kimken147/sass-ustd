import { WalletConfig } from '@/shared/types/wallet';

export const bitpieConfig: WalletConfig = {
  name: 'Bitpie',
  buildDeeplink: (targetUrl: string) =>
    `bitpie://bapp?url=${encodeURIComponent(targetUrl)}`,
};
