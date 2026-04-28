'use client';

import { useEffect } from 'react';

export function PwaRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
      });
    }
  }, []);

  return null;
}
