'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Bell, Shield, Globe, Settings2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface UserSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  twoFactorEnabled: boolean;
  language: string;
  timezone: string;
}

function SettingRow({
  label,
  description,
  checked,
  onToggle,
  delay = 0,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center justify-between py-4 group"
    >
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium text-foreground/90">{label}</p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-600 data-[state=checked]:to-pink-600"
      />
    </motion.div>
  );
}

function SettingsSection({
  icon,
  iconColor,
  title,
  description,
  children,
  delay = 0,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative"
    >
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-white/[0.02] pointer-events-none" />
      <div className="relative bg-card/40 backdrop-blur-sm rounded-2xl border border-white/8 overflow-hidden">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="p-6">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className={cn('p-2.5 rounded-xl border', iconColor)}>
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground/70">{description}</p>
            </div>
          </div>
          {/* Divider */}
          <div className="h-px bg-white/5 mb-1" />
          <div className="divide-y divide-white/5">
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const { user, profile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    twoFactorEnabled: false,
    language: 'zh',
    timezone: 'Asia/Shanghai',
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth/signin');
      return;
    }

    const loadSettings = async () => {
      try {
        if (firestore) {
          const settingsDoc = await getDoc(doc(firestore, 'userSettings', user.uid));
          if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            setSettings(prev => ({ ...prev, ...data }));
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user, authLoading, firestore, router]);

  const handleSave = async () => {
    if (!user || !firestore) return;

    setIsSaving(true);
    try {
      const settingsRef = doc(firestore, 'userSettings', user.uid);
      await updateDoc(settingsRef, {
        ...settings,
        updatedAt: serverTimestamp(),
      });

      toast({ title: '设置已保存', description: '您的设置已成功更新。' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ variant: 'destructive', title: '保存失败', description: '无法保存设置，请稍后重试。' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSetting = (key: keyof UserSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="absolute -inset-4 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="relative h-10 w-10 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      {/* Background accents */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-pink-600/6 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-10"
        >
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <Settings2 className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent font-headline">
              账户设置
            </h1>
            <p className="text-sm text-muted-foreground/70">管理您的通知偏好、安全设置和其他选项</p>
          </div>
        </motion.div>

        <div className="space-y-4">
          {/* Notification Settings */}
          <SettingsSection
            delay={0.1}
            icon={<Bell className="h-5 w-5 text-purple-400" />}
            iconColor="bg-purple-500/15 border-purple-500/20"
            title="通知设置"
            description="管理您接收通知的方式"
          >
            <SettingRow
              label="邮件通知"
              description="接收订单更新和重要通知"
              checked={settings.emailNotifications}
              onToggle={() => toggleSetting('emailNotifications')}
              delay={0.15}
            />
            <SettingRow
              label="推送通知"
              description="接收实时消息和提醒"
              checked={settings.pushNotifications}
              onToggle={() => toggleSetting('pushNotifications')}
              delay={0.2}
            />
            <SettingRow
              label="营销邮件"
              description="接收促销和优惠信息"
              checked={settings.marketingEmails}
              onToggle={() => toggleSetting('marketingEmails')}
              delay={0.25}
            />
          </SettingsSection>

          {/* Security Settings */}
          <SettingsSection
            delay={0.2}
            icon={<Shield className="h-5 w-5 text-green-400" />}
            iconColor="bg-green-500/15 border-green-500/20"
            title="安全设置"
            description="保护您的账户安全"
          >
            <SettingRow
              label="双因素认证"
              description="启用后登录时需要额外验证"
              checked={settings.twoFactorEnabled}
              onToggle={() => toggleSetting('twoFactorEnabled')}
              delay={0.3}
            />
          </SettingsSection>
        </div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-end mt-8"
        >
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all duration-300 px-8"
          >
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />保存中...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />保存设置</>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
