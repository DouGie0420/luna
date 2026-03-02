'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { CreditCard, Wallet, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentMethod = 'usdt' | 'creditCard' | 'paypal' | 'alipay';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  icon: React.ReactNode;
  description: string;
  enabled: boolean;
}

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  className?: string;
}

export function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  className
}: PaymentMethodSelectorProps) {
  const firestore = useFirestore();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([
    {
      id: 'usdt',
      name: 'USDT',
      icon: <Wallet className="h-6 w-6" />,
      description: 'Pay with USDT cryptocurrency',
      enabled: true // 默认启用
    },
    {
      id: 'creditCard',
      name: 'Credit Card',
      icon: <CreditCard className="h-6 w-6" />,
      description: 'Pay with Visa, Mastercard, etc.',
      enabled: false
    },
    {
      id: 'paypal',
      name: 'PayPal',
      icon: <DollarSign className="h-6 w-6" />,
      description: 'Pay with PayPal account',
      enabled: false
    },
    {
      id: 'alipay',
      name: 'Alipay',
      icon: <DollarSign className="h-6 w-6" />,
      description: 'Pay with Alipay',
      enabled: false
    }
  ]);

  // 从Firestore读取支付设置
  useEffect(() => {
    if (!firestore) return;

    const loadPaymentSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(firestore, 'settings', 'payment'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setPaymentMethods(prev => prev.map(method => ({
            ...method,
            enabled: data[`${method.id}Enabled`] ?? (method.id === 'usdt')
          })));
        }
      } catch (error) {
        console.error('Error loading payment settings:', error);
      }
    };

    loadPaymentSettings();
  }, [firestore]);

  // 只显示启用的支付方式
  const enabledMethods = paymentMethods.filter(m => m.enabled);

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-lg font-bold text-white mb-4">Select Payment Method</h3>
      {enabledMethods.map((method) => (
        <button
          key={method.id}
          onClick={() => onMethodChange(method.id)}
          className={cn(
            "w-full p-4 rounded-xl border-2 transition-all duration-200",
            "flex items-center gap-4 text-left",
            selectedMethod === method.id
              ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(255,0,255,0.2)]"
              : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
          )}
        >
          <div className={cn(
            "p-3 rounded-lg",
            selectedMethod === method.id
              ? "bg-primary/20 text-primary"
              : "bg-white/10 text-white/70"
          )}>
            {method.icon}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-white">{method.name}</h4>
            <p className="text-sm text-white/60">{method.description}</p>
          </div>
          {selectedMethod === method.id && (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          )}
        </button>
      ))}
      
      {enabledMethods.length === 0 && (
        <div className="text-center p-8 text-white/60">
          No payment methods available
        </div>
      )}
    </div>
  );
}
