'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
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
  usdt: true, // 默认开启状态，对应前端的 ETH 支付通道
  alipay: false,
  wechat: false,
  promptpay: false,
};

/**
 * Hook to fetch and subscribe to payment methods configuration from Firestore
 * 这里的 'usdt' 开关实际控制前端已完善的 ETH 支付功能
 */
export function usePaymentMethods() {
  const firestore = useFirestore();
  const [methods, setMethods] = useState<PaymentMethods>(DEFAULT_PAYMENT_METHODS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firestore) return;

    // 监听后台统一的支付设置路径
    const settingsRef = doc(firestore, 'settings', 'payment');

    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          // 统一数据源：确保字段名与后台 AdminPromotionsPage 保存的字段严格对应
          setMethods({
            // 这里的 usdt 开关将作为你 ETH 支付逻辑的“遥控器”
            usdt: data.usdtEnabled ?? data.isUSDTEnabled ?? true,
            alipay: data.alipayEnabled ?? data.isAlipayEnabled ?? false,
            wechat: data.wechatEnabled ?? data.isWechatEnabled ?? false,
            promptpay: data.promptpayEnabled ?? data.isPromptpayEnabled ?? false,
          });
        } else {
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

  /**
   * 辅助函数：检查特定支付方式是否启用
   */
  const isEnabled = (method: keyof PaymentMethods): boolean => {
    return methods[method] ?? false;
  };

  /**
   * 检查是否仅开启了主支付通道 (ETH)
   */
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