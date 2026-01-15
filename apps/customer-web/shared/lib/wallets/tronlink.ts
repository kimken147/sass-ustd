import { WalletConfig } from '@/shared/types/wallet';

export const tronlinkConfig: WalletConfig = {
  name: 'TronLink',
  buildDeeplink: (targetUrl: string) => {
    const param = {
      url: targetUrl,
      action: 'open',
      protocol: 'tronlink',
      version: '1.0',
    };
    return `tronlinkoutside://pull.activity?param=${encodeURIComponent(JSON.stringify(param))}`;
  },
};
