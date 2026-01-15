'use client';

import { useState, useCallback } from 'react';
import { ApproveState } from '@/shared/types/wallet';
import { AppError, ErrorCode } from '@/shared/lib/errors';
import { MAX_UINT256 } from '@/shared/lib/constants';

/**
 * Hook for managing USDT token approval transactions on TRON network.
 *
 * This hook provides functionality to approve a spender to transfer tokens
 * on behalf of the user. It manages loading state, error handling, and
 * transaction hash tracking.
 *
 * @returns {object} Approve state and functions
 * @property {boolean} isLoading - Whether an approval transaction is in progress
 * @property {AppError | null} error - Any error that occurred during approval
 * @property {string | null} txHash - The transaction hash of the successful approval
 * @property {function} approve - Function to initiate token approval
 * @property {function} reset - Function to reset the state
 *
 * @example
 * ```tsx
 * const { isLoading, error, txHash, approve, reset } = useApprove();
 *
 * const handleApprove = async () => {
 *   try {
 *     const hash = await approve(
 *       'TSpenderAddressHere',
 *       'TTokenAddressHere'
 *     );
 *     console.log('Approval transaction:', hash);
 *   } catch (err) {
 *     console.error('Approval failed:', err);
 *   }
 * };
 *
 * return (
 *   <button onClick={handleApprove} disabled={isLoading}>
 *     {isLoading ? '授權中...' : '授權'}
 *   </button>
 * );
 * ```
 */
export function useApprove() {
  const [state, setState] = useState<ApproveState>({
    isLoading: false,
    error: null,
    txHash: null,
  });

  const approve = useCallback(async (
    spenderAddress: string,
    tokenAddress: string,
  ): Promise<string> => {
    let mounted = true;

    if (mounted) {
      setState({ isLoading: true, error: null, txHash: null });
    }

    try {
      const tronWeb = window.tronWeb;

      if (!tronWeb || !tronWeb.ready) {
        throw new AppError(ErrorCode.WALLET_NOT_CONNECTED, '錢包未連接');
      }

      const contract = await tronWeb.contract().at(tokenAddress);
      const tx = await contract.approve(spenderAddress, MAX_UINT256).send();

      if (mounted) {
        setState({ isLoading: false, error: null, txHash: tx });
      }
      return tx;

    } catch (err: unknown) {
      let error: AppError;

      if (err instanceof Error) {
        const message = err.message.toLowerCase();
        if (message.includes('cancel') || message.includes('reject') || message.includes('confirmation')) {
          error = new AppError(ErrorCode.APPROVE_REJECTED, '您已取消授權', err);
        } else if (message.includes('balance') || message.includes('insufficient')) {
          error = new AppError(ErrorCode.INSUFFICIENT_BALANCE, '餘額不足', err);
        } else {
          error = new AppError(ErrorCode.APPROVE_FAILED, '授權失敗，請重試', err);
        }
      } else if (err && typeof err === 'object' && 'message' in err) {
        // Handle objects with message property
        const message = String((err as { message: unknown }).message).toLowerCase();
        if (message.includes('cancel') || message.includes('reject') || message.includes('confirmation')) {
          error = new AppError(ErrorCode.APPROVE_REJECTED, '您已取消授權', err);
        } else if (message.includes('balance') || message.includes('insufficient')) {
          error = new AppError(ErrorCode.INSUFFICIENT_BALANCE, '餘額不足', err);
        } else {
          error = new AppError(ErrorCode.APPROVE_FAILED, '授權失敗，請重試', err);
        }
      } else {
        error = new AppError(ErrorCode.APPROVE_FAILED, '授權失敗，請重試', err);
      }

      if (mounted) {
        setState({ isLoading: false, error, txHash: null });
      }
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, txHash: null });
  }, []);

  return { ...state, approve, reset };
}
