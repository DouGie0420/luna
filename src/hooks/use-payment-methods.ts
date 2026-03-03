'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export interface PaymentMethods {
  usdt: boolean;
  alipay: boolean;
  wechat: boolean;
  promptpay: boolean;
}

export interface PaymentMethodsConfig {
  paymentMethods: PaymentMethods;
  updatedAt?: Date;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethods = {
  usdt: true,
  alipay: false,
  wechat: false,
  promptpay: false,
};

/**
 * Hook to fetch and subscribe to payment methods configuration from Firestore
 * Default: Only USDT is enabled, others are disabled
 */
export function usePaymentMethods() {
  const firestore = useFirestore();
  const [methods, setMethods] = useState<PaymentMethods>(DEFAULT_PAYMENT_METHODS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firestore) return;

    const settingsRef = doc(firestore, 'settings', 'global');

    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          // Merge with defaults to ensure all fields exist
          const paymentMethods = {
            ...DEFAULT_PAYMENT_METHODS,
            ...(data.paymentMethods || {}),
          };
          setMethods(paymentMethods);
        } else {
          // Document doesn't exist, use defaults
          setMethods(DEFAULT_PAYMENT_METHODS);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching payment methods:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore]);

  // Helper to check if a specific method is enabled
  const isEnabled = (method: keyof PaymentMethods): boolean => {
    return methods[method] ?? false;
  };

  // Check if only USDT is enabled (default MVP state)
  const isOnlyUSDTEnabled = (): boolean => {
    return methods.usdt && !methods.alipay && !methods.wechat && !methods.promptpay;
  };

  return {
    methods,
    loading,
    error,
    isEnabled,
    isOnlyUSDTEnabled,
  };
}
