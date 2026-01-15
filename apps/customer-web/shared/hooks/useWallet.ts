'use client';

import { useState, useEffect } from 'react';
import { WalletState } from '@/shared/types/wallet';
import { AppError, ErrorCode } from '@/shared/lib/errors';
import { WALLET_CONNECTION_DELAY } from '@/shared/lib/constants';

export function useWallet(): WalletState {
  const [state, setState] = useState<WalletState>({
    isReady: false,
    isConnected: false,
    address: null,
    error: null,
  });

  useEffect(() => {
    const checkWallet = async () => {
      // Check if TronWeb exists
      if (typeof window.tronWeb === 'undefined') {
        setState({
          isReady: true,
          isConnected: false,
          address: null,
          error: new AppError(
            ErrorCode.WALLET_NOT_FOUND,
            '請在錢包 App 中開啟此頁面'
          ),
        });
        return;
      }

      // Wait for wallet injection to complete
      await new Promise(resolve => setTimeout(resolve, WALLET_CONNECTION_DELAY));

      const tronWeb = window.tronWeb;

      // Check if connected
      if (!tronWeb.ready) {
        setState({
          isReady: true,
          isConnected: false,
          address: null,
          error: new AppError(
            ErrorCode.WALLET_NOT_CONNECTED,
            '請先連接錢包'
          ),
        });
        return;
      }

      // Successfully connected
      setState({
        isReady: true,
        isConnected: true,
        address: tronWeb.defaultAddress.base58,
        error: null,
      });
    };

    checkWallet();
  }, []);

  return state;
}
