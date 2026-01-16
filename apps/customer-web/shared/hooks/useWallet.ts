'use client';

import { useState, useEffect } from 'react';
import { WalletState } from '@/shared/types/wallet';
import { AppError, ErrorCode } from '@/shared/lib/errors';
import { WALLET_CONNECTION_DELAY } from '@/shared/lib/constants';

/**
 * Hook for managing TronLink wallet connection state.
 *
 * This hook checks for TronWeb availability, waits for wallet injection to complete,
 * and returns the current wallet connection state including address and any errors.
 *
 * @returns {WalletState} The current wallet state
 * @property {boolean} isReady - Whether the wallet check has completed
 * @property {boolean} isConnected - Whether the wallet is connected
 * @property {string | null} address - The connected wallet address (base58 format)
 * @property {AppError | null} error - Any error that occurred during wallet connection
 *
 * @example
 * ```tsx
 * const { isReady, isConnected, address, error } = useWallet();
 *
 * if (!isReady) return <div>检查钱包中...</div>;
 * if (error) return <div>错误: {error.message}</div>;
 * if (!isConnected) return <div>请连接钱包</div>;
 *
 * return <div>已连接: {address}</div>;
 * ```
 */
export function useWallet(): WalletState {
  const [state, setState] = useState<WalletState>({
    isReady: false,
    isConnected: false,
    address: null,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const checkWallet = async () => {
      // Check if TronWeb exists
      if (typeof window.tronWeb === 'undefined') {
        if (!mounted) return;
        setState({
          isReady: true,
          isConnected: false,
          address: null,
          error: new AppError(
            ErrorCode.WALLET_NOT_FOUND,
            '请在钱包 App 中打开此页面'
          ),
        });
        return;
      }

      // Wait for wallet injection to complete
      await new Promise(resolve => setTimeout(resolve, WALLET_CONNECTION_DELAY));

      if (!mounted) return;

      const tronWeb = window.tronWeb;

      // Check if connected
      if (!tronWeb.ready) {
        if (!mounted) return;
        setState({
          isReady: true,
          isConnected: false,
          address: null,
          error: new AppError(
            ErrorCode.WALLET_NOT_CONNECTED,
            '请先连接钱包'
          ),
        });
        return;
      }

      // Check if defaultAddress exists and has base58 property
      if (!tronWeb.defaultAddress || !tronWeb.defaultAddress.base58) {
        if (!mounted) return;
        setState({
          isReady: true,
          isConnected: false,
          address: null,
          error: new AppError(
            ErrorCode.WALLET_NOT_CONNECTED,
            '无法获取钱包地址'
          ),
        });
        return;
      }

      // Successfully connected
      if (!mounted) return;
      setState({
        isReady: true,
        isConnected: true,
        address: tronWeb.defaultAddress.base58,
        error: null,
      });
    };

    checkWallet();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
