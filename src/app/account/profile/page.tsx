'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, MapPin, Mail, Calendar, Shield, Edit3, Camera, Settings, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { UserProfile } from '@/lib/types';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { user, profile: initialProfile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    location: '',
    gender: '保密',
  });

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
        toast({ variant: 'destructive', title: '加载失败', description: '无法加载用户资料，请稍后重试。' });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user, authLoading, firestore, initialProfile, router, toast]);

  const handleSave = async () => {
    if (!user || !firestore) return;

    setIsSaving(true);
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, { ...formData, updatedAt: serverTimestamp() });
      setProfile(prev => prev ? { ...prev, ...formData } : null);
      setIsEditing(false);
      toast({ title: '保存成功', description: '您的个人资料已更新。' });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({ variant: 'destructive', title: '保存失败', description: '无法保存资料，请稍后重试。' });
    } finally {
      setIsSaving(false);
    }
  };

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="absolute -inset-4 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="relative h-10 w-10 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="relative min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[300px] h-[300px] bg-pink-600/6 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent font-headline">
            个人中心
          </h1>
          <p className="text-sm text-muted-foreground/70 mt-1">管理您的个人资料和账户设置</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="relative lg:col-span-1"
          >
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-purple-500/20 via-transparent to-pink-500/10 pointer-events-none" />
            <div className="relative bg-card/50 backdrop-blur-sm rounded-2xl border border-white/8 overflow-hidden">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

              <div className="p-6 text-center">
                {/* Avatar */}
                <div className="relative inline-block mb-4">
                  <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-purple-500/40 to-pink-500/40 blur-sm" />
                  <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-purple-400/50 to-pink-400/30" />
                  <Avatar className="relative h-24 w-24 ring-2 ring-background">
                    <AvatarImage src={profile.photoURL || undefined} alt={profile.displayName} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-2xl">
                      {profile.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    href="/account/nft-avatar"
                    className="absolute bottom-0 right-0 p-1.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                  >
                    <Camera className="h-3.5 w-3.5 text-white" />
                  </Link>
                </div>

                <h2 className="font-semibold text-base bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
                  {profile.displayName}
                </h2>

                <div className="flex items-center justify-center gap-1.5 mt-1">
                  {profile.role && profile.role !== 'user' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/20">
                      <Shield className="h-3 w-3" />
                      {profile.role}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground/60">@{profile.loginId || user.uid.slice(0, 8)}</span>
                </div>

                <div className="mt-5 space-y-2.5 text-left">
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground/80">
                    <Mail className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                  {profile.location && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground/80">
                      <MapPin className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                      <span className="text-xs">{profile.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground/80">
                    <Calendar className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span className="text-xs">
                      Joined {profile.createdAt?.toDate ? new Date(profile.createdAt.toDate()).toLocaleDateString('zh-CN') : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/8 space-y-2">
                  <Link href="/account/settings">
                    <Button variant="outline" size="sm" className="w-full border-white/10 hover:bg-white/5 hover:border-purple-500/30 text-xs">
                      <Settings className="h-3.5 w-3.5 mr-2" />
                      账户设置
                    </Button>
                  </Link>
                  <Link href="/account">
                    <Button variant="outline" size="sm" className="w-full border-white/10 hover:bg-white/5 hover:border-purple-500/30 text-xs">
                      <User className="h-3.5 w-3.5 mr-2" />
                      账户总览
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Edit Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="relative lg:col-span-2"
          >
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-white/[0.02] pointer-events-none" />
            <div className="relative bg-card/40 backdrop-blur-sm rounded-2xl border border-white/8 overflow-hidden">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <div className="p-6">
                {/* Form Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/20">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">个人资料</h3>
                      <p className="text-xs text-muted-foreground/60">编辑您的个人资料信息</p>
                    </div>
                  </div>

                  {!isEditing ? (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      size="sm"
                      className="border-white/10 hover:bg-purple-500/10 hover:border-purple-500/30 text-xs"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-2" />
                      编辑
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        size="sm"
                        className="border-white/10 hover:bg-white/5 text-xs"
                        disabled={isSaving}
                      >
                        取消
                      </Button>
                      <Button
                        onClick={handleSave}
                        size="sm"
                        disabled={isSaving}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 shadow-[0_0_15px_rgba(168,85,247,0.3)] text-xs px-4"
                      >
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                        保存
                      </Button>
                    </div>
                  )}
                </div>

                <div className="h-px bg-white/5 mb-6" />

                <div className="space-y-5">
                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-purple-400" />
                      昵称
                    </Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      disabled={!isEditing}
                      className="bg-background/50 border-white/10 hover:border-purple-500/30 focus:border-purple-500/60 focus-visible:ring-purple-500/20 h-10 text-sm transition-colors disabled:opacity-60"
                      placeholder="输入您的昵称"
                    />
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-xs font-medium text-foreground/70">
                      个人简介
                    </Label>
                    <textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      disabled={!isEditing}
                      className="w-full min-h-[90px] px-3 py-2.5 rounded-xl bg-background/50 border border-white/10 text-sm placeholder:text-muted-foreground/40 focus:border-purple-500/60 focus:outline-none focus:ring-1 focus:ring-purple-500/20 resize-none disabled:opacity-60 transition-colors hover:border-purple-500/30"
                      placeholder="介绍一下自己..."
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-pink-400" />
                      所在地区
                    </Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      disabled={!isEditing}
                      className="bg-background/50 border-white/10 hover:border-purple-500/30 focus:border-purple-500/60 focus-visible:ring-purple-500/20 h-10 text-sm transition-colors disabled:opacity-60"
                      placeholder="输入您所在的地区"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground/70">性别</Label>
                    <div className="flex gap-2">
                      {['保密', '男', '女'].map((gender) => (
                        <label
                          key={gender}
                          className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm cursor-pointer transition-all',
                            formData.gender === gender
                              ? 'border-purple-500/40 bg-gradient-to-r from-purple-500/15 to-pink-500/10 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
                              : 'border-white/10 text-muted-foreground hover:border-white/20',
                            !isEditing && 'cursor-not-allowed opacity-50'
                          )}
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
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
