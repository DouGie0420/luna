// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Settings as SettingsIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentSettings {
  usdtEnabled: boolean;
  creditCardEnabled: boolean;
  paypalEnabled: boolean;
  alipayEnabled: boolean;
}

export default function SettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PaymentSettings>({
    usdtEnabled: true,
    creditCardEnabled: false,
    paypalEnabled: false,
    alipayEnabled: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 加载设置
  useEffect(() => {
    if (!firestore) return;

    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(firestore, 'settings', 'payment'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setSettings({
            usdtEnabled: data.usdtEnabled ?? true,
            creditCardEnabled: data.creditCardEnabled ?? false,
            paypalEnabled: data.paypalEnabled ?? false,
            alipayEnabled: data.alipayEnabled ?? false
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load settings.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [firestore, toast]);

  // 保存设置
  const handleSave = async () => {
    if (!firestore) return;

    setIsSaving(true);

    try {
      await setDoc(doc(firestore, 'settings', 'payment'), {
        ...settings,
        updatedAt: serverTimestamp()
      });

      toast({
        title: 'Settings saved!',
        description: 'Payment settings have been updated successfully.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (key: keyof PaymentSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-2">System Settings</h1>
          <p className="text-white/60">Configure payment methods and system parameters</p>
        </div>

        {/* Payment Methods */}
        <Card className="glass-morphism border-white/10 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-white">Payment Methods</h2>
          </div>

          <div className="space-y-6">
            {/* USDT */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">USDT (TRC20)</h3>
                <p className="text-sm text-white/60">
                  Enable USDT cryptocurrency payments
                </p>
              </div>
              <Switch
                checked={settings.usdtEnabled}
                onCheckedChange={() => handleToggle('usdtEnabled')}
              />
            </div>

            {/* Credit Card */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Credit Card</h3>
                <p className="text-sm text-white/60">
                  Enable credit card payments (Visa, Mastercard, etc.)
                </p>
                <p className="text-xs text-yellow-400 mt-1">Coming soon</p>
              </div>
              <Switch
                checked={settings.creditCardEnabled}
                onCheckedChange={() => handleToggle('creditCardEnabled')}
                disabled
              />
            </div>

            {/* PayPal */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">PayPal</h3>
                <p className="text-sm text-white/60">
                  Enable PayPal payments
                </p>
                <p className="text-xs text-yellow-400 mt-1">Coming soon</p>
              </div>
              <Switch
                checked={settings.paypalEnabled}
                onCheckedChange={() => handleToggle('paypalEnabled')}
                disabled
              />
            </div>

            {/* Alipay */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Alipay</h3>
                <p className="text-sm text-white/60">
                  Enable Alipay payments
                </p>
                <p className="text-xs text-yellow-400 mt-1">Coming soon</p>
              </div>
              <Switch
                checked={settings.alipayEnabled}
                onCheckedChange={() => handleToggle('alipayEnabled')}
                disabled
              />
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-primary to-secondary px-8"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
