import { REFERRAL_CODE_KEY } from './constants';

export function saveReferralCode(code: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(REFERRAL_CODE_KEY, code);
    } catch (error) {
      console.error('Failed to save referral code:', error);
    }
  }
}

export function getReferralCode(): string | null {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(REFERRAL_CODE_KEY);
    } catch (error) {
      console.error('Failed to get referral code:', error);
      return null;
    }
  }
  return null;
}

export function clearReferralCode(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(REFERRAL_CODE_KEY);
    } catch (error) {
      console.error('Failed to clear referral code:', error);
    }
  }
}
