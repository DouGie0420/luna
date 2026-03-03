'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, MapPin, Mail, Calendar, Shield, Edit3, Camera, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { UserProfile } from '@/lib/types';

export default function ProfilePage() {
  const { user, profile: initialProfile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // 编辑表单状态
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    location: '',
    gender: '保密',
  });

  // 加载用户资料
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth/signin');
      return;
    }

    const loadProfile = async () => {
      try {
        if (initialProfile) {
          setProfile(initialProfile);
          setFormData({
            displayName: initialProfile.displayName || '',
            bio: initialProfile.bio || '',
            location: initialProfile.location || '',
            gender: initialProfile.gender || '保密',
          });
        } else if (firestore) {
          const userDoc = await getDoc(doc(firestore, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            setProfile(userData);
            setFormData({
              displayName: userData.displayName || '',
              bio: userData.bio || '',
              location: userData.location || '',
              gender: userData.gender || '保密',
            });
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast({
          variant: 'destructive',
          title: '加载失败',
          description: '无法加载用户资料，请稍后重试。',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user, authLoading, firestore, initialProfile, router, toast]);

  // 保存资料
  const handleSave = async () => {
    if (!user || !firestore) return;

    setIsSaving(true);
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        ...formData,
        updatedAt: serverTimestamp(),
      });

      // 更新本地状态
      setProfile(prev => prev ? { ...prev, ...formData } : null);
      setIsEditing(false);

      toast({
        title: '保存成功',
        description: '您的个人资料已更新。',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        variant: 'destructive',
        title: '保存失败',
        description: '无法保存资料，请稍后重试。',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    setFormData({
      displayName: profile?.displayName || '',
      bio: profile?.bio || '',
      location: profile?.location || '',
      gender: profile?.gender || '保密',
    });
    setIsEditing(false);
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">个人中心</h1>
          <p className="text-white/60">管理您的个人资料和账户设置</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：基本信息卡片 */}
          <Card className="glass-morphism border-white/10 lg:col-span-1">
            <CardHeader className="text-center">
              <div className="relative mx-auto mb-4">
                <Avatar className="h-24 w-24 border-4 border-primary/30">
                  <AvatarImage src={profile.photoURL || undefined} alt={profile.displayName} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
                    {profile.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <Link
                  href="/account/nft-avatar"
                  className="absolute bottom-0 right-0 p-2 bg-primary rounded-full hover:bg-primary/80 transition-colors"
                >
                  <Camera className="h-4 w-4 text-white" />
                </Link>
              </div>
              <CardTitle className="text-white text-xl">{profile.displayName}</CardTitle>
              <CardDescription className="text-white/60">
                {profile.role && profile.role !== 'user' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary mr-2">
                    <Shield className="h-3 w-3" />
                    {profile.role}
                  </span>
                )}
                @{profile.loginId || user.uid.slice(0, 8)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-white/70 text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span className="truncate">{user.email}</span>
              </div>
              {profile.location && (
                <div className="flex items-center gap-3 text-white/70 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{profile.location}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-white/70 text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Joined {profile.createdAt?.toDate ? new Date(profile.createdAt.toDate()).toLocaleDateString('zh-CN') : 'N/A'}</span>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-2">
                <Link href="/account/settings">
                  <Button variant="outline" className="w-full border-white/20 hover:bg-white/10">
                    <Settings className="h-4 w-4 mr-2" />
                    账户设置
                  </Button>
                </Link>
                <Link href="/account">
                  <Button variant="outline" className="w-full border-white/20 hover:bg-white/10">
                    <User className="h-4 w-4 mr-2" />
                    账户总览
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 右侧：编辑表单 */}
          <Card className="glass-morphism border-white/10 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">个人资料</CardTitle>
                <CardDescription className="text-white/60">
                  编辑您的个人资料信息
                </CardDescription>
              </div>
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="border-white/20 hover:bg-white/10"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  编辑
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="border-white/20 hover:bg-white/10"
                    disabled={isSaving}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="bg-primary hover:bg-primary/90"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <>
                        <span className="mr-2">保存</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 昵称 */}
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-white">昵称</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    disabled={!isEditing}
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-primary"
                    placeholder="输入您的昵称"
                  />
                </div>
              </div>

              {/* 个人简介 */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-white">个人简介</Label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full min-h-[100px] px-3 py-2 rounded-md bg-white/5 border border-white/20 text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none disabled:opacity-60"
                  placeholder="介绍一下自己..."
                />
              </div>

              {/* 所在地区 */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-white">所在地区</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    disabled={!isEditing}
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-primary"
                    placeholder="输入您所在的地区"
                  />
                </div>
              </div>

              {/* 性别 */}
              <div className="space-y-2">
                <Label className="text-white">性别</Label>
                <div className="flex gap-4">
                  {['保密', '男', '女'].map((gender) => (
                    <label
                      key={gender}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                        formData.gender === gender
                          ? 'border-primary bg-primary/20 text-white'
                          : 'border-white/20 text-white/70 hover:border-white/40'
                      } ${!isEditing && 'cursor-not-allowed opacity-60'}`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={gender}
                        checked={formData.gender === gender}
                        onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                        disabled={!isEditing}
                        className="sr-only"
                      />
                      <span>{gender}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
