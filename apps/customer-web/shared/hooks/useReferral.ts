'use client';

import { useState, useEffect } from 'react';
import { getReferralCode, saveReferralCode } from '@/shared/lib/storage';

export function useReferral() {
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    // Check URL params first (needed when opened inside wallet DApp browser,
    // since wallet browser has its own localStorage and won't have the code)
    const params = new URLSearchParams(window.location.search);
    const urlRef = params.get('ref');
    if (urlRef) {
      saveReferralCode(urlRef);
      setReferralCode(urlRef);
      return;
    }
    // Fall back to localStorage
    const code = getReferralCode();
    setReferralCode(code);
  }, []);

  const saveCode = (code: string) => {
    saveReferralCode(code);
    setReferralCode(code);
  };

  return { referralCode, saveReferralCode: saveCode };
}
