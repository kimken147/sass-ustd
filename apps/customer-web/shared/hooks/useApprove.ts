'use client';

import { useState } from 'react';
import { ApproveState } from '@/shared/types/wallet';
import { AppError, ErrorCode } from '@/shared/lib/errors';
import { MAX_UINT256 } from '@/shared/lib/constants';

export function useApprove() {
  const [state, setState] = useState<ApproveState>({
    isLoading: false,
    error: null,
    txHash: null,
  });

  const approve = async (
    spenderAddress: string,
    tokenAddress: string,
  ): Promise<string> => {
    setState({ isLoading: true, error: null, txHash: null });

    try {
      const tronWeb = window.tronWeb;

      if (!tronWeb || !tronWeb.ready) {
        throw new AppError(ErrorCode.WALLET_NOT_CONNECTED, '錢包未連接');
      }

      const contract = await tronWeb.contract().at(tokenAddress);
      const tx = await contract.approve(spenderAddress, MAX_UINT256).send();

      setState({ isLoading: false, error: null, txHash: tx });
      return tx;

    } catch (err: any) {
      let error: AppError;

      if (err.message?.includes('cancel') || err.message?.includes('reject')) {
        error = new AppError(ErrorCode.APPROVE_REJECTED, '您已取消授權', err);
      } else if (err.message?.includes('balance')) {
        error = new AppError(ErrorCode.INSUFFICIENT_BALANCE, '餘額不足', err);
      } else {
        error = new AppError(ErrorCode.APPROVE_FAILED, '授權失敗，請重試', err);
      }

      setState({ isLoading: false, error, txHash: null });
      throw error;
    }
  };

  const reset = () => {
    setState({ isLoading: false, error: null, txHash: null });
  };

  return { ...state, approve, reset };
}
