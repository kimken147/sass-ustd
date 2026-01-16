import { TenantInfo } from '@/shared/types';
import { AppError, ErrorCode } from './errors';

const PLATFORM_API_URL = process.env.NEXT_PUBLIC_PLATFORM_API_URL || 'http://localhost:3000';
const TENANT_API_URL = process.env.NEXT_PUBLIC_TENANT_API_URL || 'http://localhost:3001';

export async function getTenantByDomain(domain: string): Promise<TenantInfo | null> {
  try {
    const response = await fetch(
      `${PLATFORM_API_URL}/tenants/by-domain/${encodeURIComponent(domain)}`,
      { next: { revalidate: 300 } } as RequestInit
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new AppError(ErrorCode.API_ERROR, 'Failed to fetch tenant info');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCode.NETWORK_ERROR, 'Network error', error);
  }
}

export interface RegisterCustomerParams {
  walletAddress: string;
  approvedAmount: number;
  approvalTxHash: string;
  referralCode?: string;
}

export interface RegisterCustomerResponse {
  success: boolean;
  customerId?: string;
  message?: string;
}

export async function registerCustomer(params: RegisterCustomerParams): Promise<RegisterCustomerResponse> {
  try {
    const response = await fetch(`${TENANT_API_URL}/api/contracts/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new AppError(ErrorCode.API_ERROR, 'Failed to register customer');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCode.NETWORK_ERROR, 'Network error', error);
  }
}
