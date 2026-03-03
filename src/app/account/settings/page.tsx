'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Bell, Shield, Globe, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/lib/types';

interface UserSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  twoFactorEnabled: boolean;
  language: string;
  timezone: string;
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

  // 加载用户设置
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
            setSettings(prev => ({
              ...prev,
              ...data,
            }));
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

  // 保存设置
  const handleSave = async () => {
    if (!user || !firestore) return;

    setIsSaving(true);
    try {
      const settingsRef = doc(firestore, 'userSettings', user.uid);
      await updateDoc(settingsRef, {
        ...settings,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: '设置已保存',
        description: '您的设置已成功更新。',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: 'destructive',
        title: '保存失败',
        description: '无法保存设置，请稍后重试。',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 切换设置项
  const toggleSetting = (key: keyof UserSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">账户设置</h1>
          <p className="text-white/60">管理您的通知偏好、安全设置和其他选项</p>
        </div>

        <div className="space-y-6">
          {/* 通知设置 */}
          <Card className="glass-morphism border-white/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-white">通知设置</CardTitle>
                  <CardDescription className="text-white/60">
                    管理您接收通知的方式
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <div>
                  <p className="text-white font-medium">邮件通知</p>
                  <p className="text-sm text-white/60">接收订单更新和重要通知</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={() => toggleSetting('emailNotifications')}
                />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <div>
                  <p className="text-white font-medium">推送通知</p>
                  <p className="text-sm text-white/60">接收实时消息和提醒</p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={() => toggleSetting('pushNotifications')}
                />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-white font-medium">营销邮件</p>
                  <p className="text-sm text-white/60">接收促销和优惠信息</p>
                </div>
                <Switch
                  checked={settings.marketingEmails}
                  onCheckedChange={() => toggleSetting('marketingEmails')}
                />
              </div>
            </CardContent>
          </Card>

          {/* 安全设置 */}
          <Card className="glass-morphism border-white/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Shield className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-white">安全设置</CardTitle>
                  <CardDescription className="text-white/60">
                    保护您的账户安全
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-white font-medium">双因素认证</p>
                  <p className="text-sm text-white/60">启用后登录时需要额外验证</p>
                </div>
                <Switch
                  checked={settings.twoFactorEnabled}
                  onCheckedChange={() => toggleSetting('twoFactorEnabled')}
                />
              </div>
            </CardContent>
          </Card>

          {/* 保存按钮 */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 px-8"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  保存设置
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
