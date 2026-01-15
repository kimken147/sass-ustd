'use client';

import { useState, useEffect } from 'react';
import { getReferralCode, saveReferralCode } from '@/shared/lib/storage';

export function useReferral() {
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const code = getReferralCode();
    setReferralCode(code);
  }, []);

  const saveCode = (code: string) => {
    saveReferralCode(code);
    setReferralCode(code);
  };

  return { referralCode, saveReferralCode: saveCode };
}
