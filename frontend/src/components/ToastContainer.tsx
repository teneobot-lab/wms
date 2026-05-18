'use client';

import { useEffect } from 'react';

export function ToastContainer() {
  // This component is a placeholder — the toast logic is handled in AppShell
  // and the useToastStore. Just a clean hook for any app-level toast needs.
  useEffect(() => {
    const handleOnline = () => {
      // dispatch network status change
    };
    const handleOffline = () => {};

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null;
}