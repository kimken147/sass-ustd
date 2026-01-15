interface TronWeb {
  ready: boolean;
  defaultAddress: {
    base58: string;
    hex: string;
  };
  contract(): {
    at(address: string): Promise<any>;
  };
  toSun(amount: number): string;
  fromSun(amount: string): number;
}

interface Window {
  tronWeb?: TronWeb;
}
