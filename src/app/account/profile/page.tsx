// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from "react";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/hooks/use-translation";
import {
  Gem, ShoppingBag, ShoppingCart, Star, Users, UserPlus, ShieldCheck,
  Loader2, CheckCircle, XCircle, Award, Sparkles, Fingerprint, Globe,
  UploadCloud, X, DollarSign, Database, Image as ImageIcon, User,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { updateUserProfile } from "@/lib/user";
import Link from "next/link";
import { getNftsForOwner, SimplifiedNft } from "@/lib/alchemy";
import { NftSelectorDialog } from "@/components/nft-selector-dialog";
import { sendEmailVerification } from "firebase/auth";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { type BadgeType, type Product, type GlobalSettings } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AdminBadgeIcon } from "@/components/ui/admin-badge-icon";
import { compressImage } from "@/lib/image-compressor";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";

const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1.75l-6.172 9.5L12 17.5l6.172-6.25L12 1.75z" />
    <path d="M5.828 12.5L12 22.25l6.172-9.75L12 17.5 5.828 12.5z" />
  </svg>
);

const badgeIcons: Record<string, React.FC<{ className?: string }>> = {
  kyc: (props) => <Fingerprint {...props} />,
  web3: (props) => <Globe {...props} />,
  nft: (props) => <EthereumIcon {...props} />,
  influencer: (props) => <Award {...props} />,
  contributor: (props) => <Sparkles {...props} />,
};

const badgeColors: Partial<Record<Exclude<BadgeType, 'none' | 'pro' | 'email' | 'admin'>, string>> = {
  kyc: 'text-yellow-400',
  web3: 'text-blue-400',
  nft: 'text-blue-400',
  influencer: 'text-yellow-400',
  contributor: 'text-pink-500',
};

function GlassCard({ children, accent = 'purple', delay = 0 }: {
  children: React.ReactNode;
  accent?: 'purple' | 'blue' | 'green' | 'yellow' | 'pink';
  delay?: number;
}) {
  const colors: Record<string, string> = {
    purple: 'via-purple-500/40',
    blue: 'via-blue-500/40',
    green: 'via-green-500/40',
    yellow: 'via-yellow-500/40',
    pink: 'via-pink-500/40',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative rounded-2xl border border-white/12 bg-[#0d0715]/80 overflow-hidden"
    >
      <div className={`h-px w-full bg-gradient-to-r from-transparent ${colors[accent]} to-transparent`} />
      <div className="p-6">{children}</div>
    </motion.div>
  );
}

function GlassHeader({ icon: Icon, title, subtitle, accent = 'purple' }: {
  icon: React.FC<any>;
  title: string;
  subtitle?: string;
  accent?: string;
}) {
  const bgColors: Record<string, string> = {
    purple: 'bg-purple-500/12 border-purple-500/25',
    blue: 'bg-blue-500/12 border-blue-500/25',
    green: 'bg-green-500/12 border-green-500/25',
    yellow: 'bg-yellow-500/12 border-yellow-500/25',
    pink: 'bg-pink-500/12 border-pink-500/25',
  };
  const iconColors: Record<string, string> = {
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    pink: 'text-pink-400',
  };
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-8 h-8 rounded-xl ${bgColors[accent] || bgColors.purple} border flex items-center justify-center shrink-0`}>
        <Icon className={`h-4 w-4 ${iconColors[accent] || iconColors.purple}`} />
      </div>
      <div>
        <h2 className="text-base font-black text-white leading-none">{title}</h2>
        {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

const fieldLabelCls = "text-sm font-bold text-white/60 uppercase tracking-wider mb-1.5 block";
const inputCls = "w-full h-11 px-3 rounded-xl bg-white/[0.07] border border-white/15 text-base text-white placeholder:text-white/25 focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.10] transition-all";

export default function AccountProfilePage() {
  const { user, profile, loading } = useUser();
  const firestore = useFirestore();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('保密');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [newLoginId, setNewLoginId] = useState('');
  const [isSavingId, setIsSavingId] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSyncingNfts, setIsSyncingNfts] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [nfts, setNfts] = useState<SimplifiedNft[]>([]);
  const [isNftDialogOpen, setIsNftDialogOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const userProductsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'products'), where('sellerId', '==', user.uid));
  }, [firestore, user]);
  const { data: fetchedProducts, loading: productsLoading } = useCollection<Product>(userProductsQuery);

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isProDialogOpen, setIsProDialogOpen] = useState(false);
  const [hasPendingApplication, setHasPendingApplication] = useState(false);
  const [totalPurchased, setTotalPurchased] = useState(0);
  const [totalSold, setTotalSold] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const settingsRef = useMemo(() => firestore ? doc(firestore, 'settings', 'global') : null, [firestore]);
  const { data: globalSettings, loading: settingsLoading } = useDoc<GlobalSettings>(settingsRef);
  const isProApplicationEnabled = globalSettings?.isProApplicationEnabled ?? false;

  useEffect(() => { if (fetchedProducts) setUserProducts(fetchedProducts); }, [fetchedProducts]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setGender(profile.gender || '保密');
      setLocation(profile.location || '');
      setBio(profile.bio || '');
      setBannerPreview(profile.bannerUrl || null);
      setAvatarPreview(profile.photoURL || null);
    }
  }, [profile]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    if (!firestore || !user) return;
    const q = query(collection(firestore, 'proApplications'), where('userId', '==', user.uid), where('status', '==', 'pending'));
    getDocs(q).then(snapshot => { if (!snapshot.empty) setHasPendingApplication(true); });
  }, [firestore, user]);

  useEffect(() => {
    if (!firestore || !user) return;
    const fetchTransactionStats = async () => {
      setLoadingStats(true);
      const ordersRef = collection(firestore, 'orders');
      try {
        const purchasesQuery = query(ordersRef, where('buyerId', '==', user.uid), where('status', '==', 'Completed'));
        const purchasesSnapshot = await getDocs(purchasesQuery);
        let totalSpent = 0;
        purchasesSnapshot.forEach(doc => { totalSpent += doc.data().totalAmount || 0; });
        setTotalPurchased(totalSpent);

        const salesQuery = query(ordersRef, where('sellerId', '==', user.uid), where('status', '==', 'Completed'));
        const salesSnapshot = await getDocs(salesQuery);
        let totalEarned = 0;
        salesSnapshot.forEach(doc => { totalEarned += doc.data().totalAmount || 0; });
        setTotalSold(totalEarned);
      } catch (e) {
        console.error("Error fetching transaction stats:", e);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchTransactionStats();
  }, [firestore, user]);

  const handleSaveChanges = async () => {
    if (!firestore || !user) return;
    try {
      await updateUserProfile(firestore, user.uid, { displayName, gender, location, bio });
      toast({ title: t('accountPage.saveSuccessTitle'), description: t('accountPage.saveSuccessDescription') });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update profile.' });
    }
  };

  const handleSetLoginId = async () => {
    if (!firestore || !user || !newLoginId.trim()) return;
    const RESERVED_IDS = ['admin', 'staff', 'pay', 'root', 'luna'];
    if (RESERVED_IDS.includes(newLoginId.trim().toLowerCase())) {
      toast({ variant: "destructive", title: 'ID不可用', description: '此专属ID为系统保留，请选择其他ID。' });
      return;
    }
    if (!/^\d{3,}$/.test(newLoginId)) {
      toast({ variant: "destructive", title: '无效的专属ID', description: 'ID必须是3位或更长的纯数字。' });
      return;
    }
    setIsSavingId(true);
    try {
      const q = query(collection(firestore, 'users'), where('loginId', '==', newLoginId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast({ variant: "destructive", title: 'ID已被占用', description: '此专属ID已被其他用户使用，请更换。' });
        return;
      }
      await updateUserProfile(firestore, user.uid, { loginId: newLoginId });
      toast({ title: '专属ID设置成功！', description: `您的新专属ID是 @${newLoginId}` });
      setNewLoginId('');
    } catch (error) {
      toast({ variant: 'destructive', title: '设置失败', description: '更新您的ID时出错，请稍后再试。' });
    } finally {
      setIsSavingId(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    try {
      const compressedDataUrl = await compressImage(file);
      setBannerPreview(compressedDataUrl);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Image Error', description: error.message || 'Failed to process image.' });
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleSaveBanner = async () => {
    if (!firestore || !user || !bannerPreview) return;
    setIsUploadingBanner(true);
    try {
      await updateUserProfile(firestore, user.uid, { bannerUrl: bannerPreview });
      toast({ title: "横幅已更新", description: "您的自定义商户横幅已保存。" });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update banner.' });
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const compressedDataUrl = await compressImage(file);
      setAvatarPreview(compressedDataUrl);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Image Error', description: error.message || 'Failed to process image.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveAvatar = async () => {
    if (!firestore || !user || !avatarPreview) return;
    setIsUploadingAvatar(true);
    try {
      await updateUserProfile(firestore, user.uid, { photoURL: avatarPreview, isNftVerified: false });
      toast({ title: "头像已更新", description: "您的新头像已保存。" });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update avatar.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSendVerification = async () => {
    if (!user || cooldown > 0 || isVerifying) return;
    setIsVerifying(true);
    try {
      await sendEmailVerification(user);
      toast({ title: t('accountPage.verifyEmailSent') });
      setCooldown(60);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSyncNfts = async () => {
    if (!user || !profile?.walletAddress) {
      toast({ variant: 'destructive', title: 'Wallet Not Linked', description: 'Please link your wallet first to verify NFT assets.' });
      return;
    }
    setIsSyncingNfts(true);
    try {
      const ownerNfts = await getNftsForOwner(profile.walletAddress);
      setNfts(ownerNfts);
      setIsNftDialogOpen(true);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to sync NFTs', description: 'Could not fetch NFT data.' });
    } finally {
      setIsSyncingNfts(false);
    }
  };

  const handleSetNftAvatar = async (nft: SimplifiedNft) => {
    if (!firestore || !user) return;
    setIsUpdatingAvatar(true);
    try {
      await updateUserProfile(firestore, user.uid, {
        avatarType: 'nft',
        photoURL: nft.imageUrl,
        nftAvatarUrl: nft.imageUrl,
        nftTokenId: nft.tokenId,
        nftContractAddress: nft.contractAddress,
        isNftVerified: true,
      });
      toast({ title: 'Avatar Updated!', description: 'Your profile picture is now your NFT.' });
      setIsNftDialogOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not set NFT as avatar.' });
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handleUpgrade = async () => {
    if (!firestore || !user || !profile || !selectedPlan) return;
    setIsUpgrading(true);
    try {
      await addDoc(collection(firestore, 'proApplications'), {
        userId: user.uid,
        userName: profile.displayName || user.displayName || 'Anonymous User',
        status: 'pending' as const,
        plan: selectedPlan,
        createdAt: serverTimestamp(),
      });
      toast({ title: "申请已提交", description: "您的PRO商户申请已提交审核，请耐心等待。" });
      setIsProDialogOpen(false);
      setSelectedPlan(null);
      setHasPendingApplication(true);
    } catch (e) {
      toast({ variant: 'destructive', title: '申请失败', description: '发生未知错误，请稍后再试。' });
    } finally {
      setIsUpgrading(false);
    }
  };

  const availableBadges: { type: BadgeType; label: string; icon: React.FC<any> }[] = [];
  if (profile?.emailVerified) availableBadges.push({ type: 'email', label: t('accountPage.badges.email_label'), icon: CheckCircle });
  if (profile?.kycStatus === 'Verified') availableBadges.push({ type: 'kyc', label: t('accountPage.badges.kyc_label'), icon: badgeIcons['kyc'] });
  if (profile?.isPro) availableBadges.push({ type: 'pro', label: t('accountPage.badges.pro_label'), icon: () => null });
  if (profile?.isWeb3Verified) availableBadges.push({ type: 'web3', label: t('accountPage.badges.web3_label'), icon: badgeIcons['web3'] });
  if (profile?.isNftVerified) availableBadges.push({ type: 'nft', label: t('accountPage.badges.nft_label'), icon: badgeIcons['nft'] });
  if ((profile?.followersCount || 0) >= 10000 || profile?.isInfluencer) availableBadges.push({ type: 'influencer', label: t('accountPage.badges.influencer_label'), icon: badgeIcons['influencer'] });
  if ((profile?.featuredCount || 0) >= 20 || profile?.isContributor) availableBadges.push({ type: 'contributor', label: t('accountPage.badges.contributor_label'), icon: badgeIcons['contributor'] });
  if (['admin', 'staff', 'support', 'ghost'].includes(profile?.role || '')) {
    availableBadges.push({ type: 'admin', label: t('accountPage.badges.admin_label'), icon: AdminBadgeIcon });
  }

  const handleBadgeSelection = async (value: string) => {
    if (!firestore || !user) return;
    await updateUserProfile(firestore, user.uid, { displayedBadge: value as BadgeType });
    toast({ title: t('accountPage.badges.update_success') });
  };

  const canCustomize = profile?.isPro || ['admin', 'ghost', 'staff', 'support'].includes(profile?.role || '');

  if (loading || loadingStats) {
    return (
      <div className="p-6 md:p-8 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-[#0d0715]/80 p-6 space-y-3">
            <Skeleton className="h-5 w-40 bg-white/10" />
            <Skeleton className="h-10 w-full bg-white/10" />
            <Skeleton className="h-10 w-full bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <NftSelectorDialog
        open={isNftDialogOpen}
        onOpenChange={setIsNftDialogOpen}
        nfts={nfts}
        onSelect={handleSetNftAvatar}
        isUpdating={isUpdatingAvatar}
      />
      <Dialog open={isProDialogOpen} onOpenChange={setIsProDialogOpen}>
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-5">

          {/* Page title */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
            <h1 className="text-2xl font-black text-white tracking-tight">System <span className="text-primary">Profile</span></h1>
          </motion.div>

          {/* Lunar Vault */}
          <GlassCard accent="purple" delay={0.05}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full filter blur-[60px] pointer-events-none" />
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/40 flex items-center justify-center shadow-[0_0_24px_rgba(168,85,247,0.35)]">
                  <Database className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.4em] text-primary/70">Lunar Vault / 月壤金库</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-5xl font-black text-white">{profile?.lunarSoil || 0}</span>
                    <span className="text-base font-mono font-bold text-primary uppercase tracking-widest">Grams</span>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex flex-col items-end space-y-1 border-l border-white/10 pl-6 relative z-10">
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-yellow-400" /> Active Protocol</p>
                <p className="text-xs text-white/30 max-w-[200px] text-right leading-relaxed">Accumulate Lunar Soil through transactions, likes, and positive evaluations.</p>
              </div>
            </div>
          </GlassCard>

          {/* Personal Info */}
          <GlassCard accent="purple" delay={0.1}>
            <GlassHeader icon={User} title={t('accountPage.personalInfo')} subtitle={t('accountPage.personalInfoDescription')} />
            <div className="space-y-4">
              {/* Display Name */}
              <div>
                <label className={fieldLabelCls}>{t('accountPage.fullName')}</label>
                <input className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>

              {/* Login ID */}
              {profile && user && profile.loginId === user.uid ? (
                <div className="border border-dashed border-primary/40 p-4 rounded-xl bg-primary/5">
                  <p className="text-xs text-primary/80 mb-3 italic">检测到您尚未激活专属赛博域名</p>
                  <div className="flex gap-2">
                    <input
                      className={inputCls}
                      placeholder="输入3位以上数字..."
                      value={newLoginId}
                      onChange={(e) => setNewLoginId(e.target.value.replace(/[^0-9]/g, ''))}
                      disabled={isSavingId}
                    />
                    <Button onClick={handleSetLoginId} disabled={isSavingId || !newLoginId.trim()} className="shrink-0">
                      {isSavingId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      立即激活
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className={fieldLabelCls}>专属ID</label>
                  <div className="flex items-center gap-2">
                    <input className={inputCls} value={`@${profile?.loginId}`} readOnly style={{ cursor: 'default' }} />
                    <Button variant="outline" size="sm" className="shrink-0 border-white/15 text-white/70 hover:bg-white/5" onClick={() => {
                      navigator.clipboard.writeText(`https://luna.io/@${profile?.loginId}`);
                      toast({ title: '已复制您的专属链接！' });
                    }}>复制链接</Button>
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className={fieldLabelCls}>{t('accountPage.email')}</label>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    type="email"
                    value={profile?.email || user?.email || ''}
                    readOnly
                    style={{ cursor: 'default', opacity: 0.6 }}
                  />
                  {user && !profile?.emailVerified && (
                    <Button onClick={handleSendVerification} disabled={cooldown > 0 || isVerifying} className="shrink-0">
                      {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {cooldown > 0 ? `${t('accountPage.resendIn')} ${cooldown}s` : t('accountPage.verifyEmail')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Gender + Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={fieldLabelCls}>{t('accountPage.gender')}</label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="h-10 rounded-xl bg-white/[0.07] border-white/15 text-sm text-white focus:border-purple-500/60 focus:ring-0">
                      <SelectValue placeholder={t('accountPage.genderSelectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="男">{t('accountPage.genderMale')}</SelectItem>
                      <SelectItem value="女">{t('accountPage.genderFemale')}</SelectItem>
                      <SelectItem value="其他">{t('accountPage.genderOther')}</SelectItem>
                      <SelectItem value="保密">{t('accountPage.genderSecret')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={fieldLabelCls}>{t('accountPage.location')}</label>
                  <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('accountPage.locationPlaceholder')} />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className={fieldLabelCls}>{t('accountPage.bio')}</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t('accountPage.bioPlaceholder')}
                  rows={3}
                  maxLength={200}
                  className="rounded-xl bg-white/[0.07] border-white/15 text-sm text-white placeholder:text-white/25 focus:border-purple-500/60 focus:ring-0 resize-none"
                />
                <p className="text-[10px] text-white/30 text-right mt-1">{bio.length} / 200</p>
              </div>

              {/* Status row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-white/8">
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <p className="text-sm text-white/60 mb-1.5">{t('accountPage.kycStatus')}</p>
                  <Badge variant={profile?.kycStatus === "Verified" ? "default" : profile?.kycStatus === "Pending" ? "secondary" : "destructive"} className="text-xs">
                    {profile?.kycStatus || 'N/A'}
                  </Badge>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <p className="text-sm text-white/60 mb-1.5">{t('accountPage.emailVerification')}</p>
                  {profile?.emailVerified
                    ? <div className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-400" /><span className="text-sm text-green-400">{t('accountPage.emailVerifiedStatus.verified')}</span></div>
                    : <div className="flex items-center gap-1.5"><XCircle className="h-4 w-4 text-red-400" /><span className="text-sm text-red-400">{t('accountPage.emailVerifiedStatus.notVerified')}</span></div>
                  }
                </div>
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <p className="text-sm text-white/60 mb-1.5">{t('accountPage.joinedOn')}</p>
                  <p className="text-sm text-white/70">{profile?.createdAt?.toDate ? format(profile.createdAt.toDate(), 'PPP') : 'N/A'}</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button onClick={handleSaveChanges}>{t('accountPage.saveChanges')}</Button>
              </div>
            </div>
          </GlassCard>

          {/* Badges */}
          <GlassCard accent="yellow" delay={0.15}>
            <div className="flex items-start justify-between mb-5">
              <GlassHeader icon={Award} title={t('accountPage.badges.title')} subtitle={t('accountPage.badges.description')} accent="yellow" />
              <Button
                variant={!profile?.displayedBadge || profile.displayedBadge === 'none' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleBadgeSelection('none')}
                className="shrink-0 border-white/15 text-white/70 hover:bg-white/5"
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                {t('accountPage.badges.no_display')}
              </Button>
            </div>
            {availableBadges.length > 0 ? (
              <RadioGroup value={profile?.displayedBadge || 'none'} onValueChange={handleBadgeSelection} className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableBadges.map(({ type, label, icon: Icon }) => (
                  <Label key={type} htmlFor={`badge-${type}`} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-white/12 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/10 transition-all bg-white/[0.03] hover:bg-white/[0.06]">
                    <RadioGroupItem value={type} id={`badge-${type}`} className="sr-only" />
                    {type === 'pro' ? <span className="font-headline text-[10px] text-yellow-300">PRO</span>
                      : type === 'admin' ? <AdminBadgeIcon className="h-7 w-7" />
                      : <Icon className={cn("h-7 w-7", badgeColors[type as keyof typeof badgeColors])} />
                    }
                    <span className="text-sm font-semibold text-white/90">{label}</span>
                  </Label>
                ))}
              </RadioGroup>
            ) : (
              <p className="text-white/30 text-sm text-center py-4">{t('accountPage.badges.no_badges')}</p>
            )}
          </GlassCard>

          {/* PRO Certification */}
          <GlassCard accent="pink" delay={0.2}>
            <GlassHeader icon={ShieldCheck} title={t('accountPage.proCertification.title')} subtitle={t('accountPage.proCertification.description')} accent="pink" />
            {profile?.isPro ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/25">
                <ShieldCheck className="h-7 w-7 text-green-400 shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-300 text-sm">{t('accountPage.proCertification.alreadyPro')}</h3>
                  <p className="text-xs text-green-400/70">您已解锁所有PRO商户特权。</p>
                </div>
              </div>
            ) : hasPendingApplication ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/25">
                <Loader2 className="h-7 w-7 text-yellow-400 animate-spin shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-300 text-sm">您的 PRO 申请正在审核中</h3>
                  <p className="text-xs text-yellow-400/70">我们会在审核完成后通知您。</p>
                </div>
              </div>
            ) : (
              <>
                <DialogTrigger asChild>
                  <Button size="lg" className="w-full h-11 text-base font-bold" disabled={!isProApplicationEnabled || settingsLoading}>
                    {settingsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('accountPage.proCertification.applyButton')}
                  </Button>
                </DialogTrigger>
                {!isProApplicationEnabled && !settingsLoading && (
                  <p className="text-xs text-white/30 text-center mt-2">PRO认证申请功能当前已由管理员关闭。</p>
                )}
              </>
            )}
          </GlassCard>

          {/* Custom Avatar */}
          {canCustomize && (
            <GlassCard accent="blue" delay={0.25}>
              <GlassHeader icon={ImageIcon} title="自定义头像" subtitle="作为认证商户或管理员，您可以上传新头像和商户横幅。" accent="blue" />
              <div className="space-y-6">
                {/* Avatar Upload */}
                <div className="flex items-start gap-6">
                  <label htmlFor="avatar-upload" className="cursor-pointer shrink-0">
                    <div className="relative h-20 w-20">
                      {avatarPreview ? (
                        <Image src={avatarPreview} alt="Avatar Preview" fill className="rounded-full object-cover border-2 border-primary" />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-white/5 border border-white/12 flex items-center justify-center">
                          <UploadCloud className="h-7 w-7 text-white/30" />
                        </div>
                      )}
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  </label>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-white/40">点击头像区域选择图片文件上传新头像。</p>
                    <input id="avatar-upload" type="file" className="sr-only" onChange={handleAvatarUpload} accept="image/*" disabled={isUploadingAvatar} />
                    <Button onClick={handleSaveAvatar} disabled={isUploadingAvatar || !avatarPreview || avatarPreview === profile?.photoURL} size="sm">
                      {isUploadingAvatar && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      保存头像
                    </Button>
                  </div>
                </div>

                {/* Banner Upload (PRO only) */}
                {profile?.isPro && (
                  <>
                    <div className="h-px bg-white/8" />
                    <div>
                      <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1.5">自定义商户横幅</p>
                      <p className="text-[10px] text-white/30 mb-3">推荐尺寸: 1080x432. 将展示在您的公开资料页和认证商户列表中。</p>
                      {bannerPreview ? (
                        <div className="relative aspect-[1080/432] w-full mb-3">
                          <Image src={bannerPreview} alt="Banner Preview" fill className="object-cover rounded-xl border border-white/12" />
                          <button
                            type="button"
                            onClick={() => setBannerPreview(null)}
                            disabled={isUploadingBanner}
                            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-black/80 border border-white/20 flex items-center justify-center text-white hover:bg-black transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="banner-upload" className="flex flex-col items-center justify-center w-full h-28 border border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors mb-3">
                          <UploadCloud className="w-7 h-7 mb-1.5 text-white/25" />
                          <p className="text-xs text-white/30"><span className="font-semibold">点击上传</span> 或拖拽</p>
                          <input id="banner-upload" type="file" className="sr-only" onChange={handleBannerUpload} accept="image/*" disabled={isUploadingBanner} />
                        </label>
                      )}
                      {isUploadingBanner && <p className="text-xs text-white/40 flex items-center gap-2 mb-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> 正在处理图片...</p>}
                      <Button onClick={handleSaveBanner} disabled={isUploadingBanner || !bannerPreview} size="sm">
                        {isUploadingBanner && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        保存横幅
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </GlassCard>
          )}

          {/* Featured Product (PRO only) */}
          {profile?.isPro && (
            <GlassCard accent="yellow" delay={0.3}>
              <GlassHeader icon={ShoppingBag} title="精选商品展示" subtitle='选择一件您的商品，它将被展示在首页"认证商户"区域您的名片下方。' accent="yellow" />
              {productsLoading ? (
                <Skeleton className="h-10 w-full bg-white/10 rounded-xl" />
              ) : (
                <Select
                  value={profile.featuredProductId || 'none'}
                  onValueChange={async (value) => {
                    if (!firestore || !user) return;
                    await updateUserProfile(firestore, user.uid, { featuredProductId: value === 'none' ? null : value });
                    toast({ title: "精选商品已更新" });
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-white/[0.07] border-white/15 text-sm text-white focus:border-purple-500/60 focus:ring-0">
                    <SelectValue placeholder="选择一件商品来展示" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无 (不展示)</SelectItem>
                    {userProducts.map(product => (
                      <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </GlassCard>
          )}

          {/* Crypto Wallet / NFT */}
          <GlassCard accent="blue" delay={0.35}>
            <GlassHeader icon={Globe} title="Crypto Wallet" subtitle="将您的数字资产展示在月之女神的静谧中" accent="blue" />
            <Button onClick={handleSyncNfts} disabled={isSyncingNfts || !profile?.walletAddress}>
              {isSyncingNfts && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              验证 NFT 资产
            </Button>
            {!profile?.walletAddress && (
              <p className="text-xs text-white/30 mt-2">请先绑定钱包地址以启用此功能。</p>
            )}
          </GlassCard>

          {/* Credit & Stats */}
          <GlassCard accent="purple" delay={0.4}>
            <GlassHeader icon={Gem} title={t('accountPage.creditTitle')} subtitle={t('accountPage.creditDescription')} />
            <div className="space-y-4">
              {/* Credit score */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/10">
                <Gem className="h-8 w-8 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-white/60">{t('accountPage.creditLevel')}</p>
                  <p className="text-lg font-bold text-white">{profile?.creditLevel || 'Newcomer'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/60">{t('accountPage.creditScore')}</p>
                  <p className="text-lg font-bold text-white">{profile?.creditScore || 0}</p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Star, label: t('accountPage.rating'), value: `${profile?.rating?.toFixed(1) || '0.0'} (${profile?.reviewsCount || 0})`, color: 'text-yellow-400' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                    <Icon className={`h-5 w-5 shrink-0 ${color || 'text-purple-400'}`} />
                    <div className="min-w-0">
                      <p className="text-xs text-white/40 font-mono uppercase tracking-wider">{label}</p>
                      <p className="text-base font-black text-white leading-tight">{value}</p>
                    </div>
                  </div>
                ))}
                <Link href="/account/listings" className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-purple-500/30 hover:bg-purple-500/10 transition-all">
                  <ShoppingBag className="h-5 w-5 shrink-0 text-purple-400" />
                  <div><p className="text-xs text-white/40 font-mono uppercase tracking-wider">{t('sellerProfile.onSale')}</p><p className="text-base font-black text-white">{profile?.onSaleCount || 0}</p></div>
                </Link>
                <Link href="/account/sales" className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-purple-500/30 hover:bg-purple-500/10 transition-all">
                  <DollarSign className="h-5 w-5 shrink-0 text-purple-400" />
                  <div><p className="text-xs text-white/40 font-mono uppercase tracking-wider">{t('accountPage.sales')}</p><p className="text-base font-black text-white">{profile?.salesCount || 0}</p></div>
                </Link>
                <Link href="/account/purchases" className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-purple-500/30 hover:bg-purple-500/10 transition-all">
                  <ShoppingCart className="h-5 w-5 shrink-0 text-purple-400" />
                  <div><p className="text-xs text-white/40 font-mono uppercase tracking-wider">{t('accountPage.purchases')}</p><p className="text-base font-black text-white">{profile?.purchasesCount || 0}</p></div>
                </Link>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <DollarSign className="h-5 w-5 shrink-0 text-green-400" />
                  <div><p className="text-xs text-white/40 font-mono uppercase tracking-wider">{t('accountPage.totalSold')}</p><p className="text-base font-black text-white">{totalSold.toLocaleString()}</p></div>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <DollarSign className="h-5 w-5 shrink-0 text-blue-400" />
                  <div><p className="text-xs text-white/40 font-mono uppercase tracking-wider">{t('accountPage.totalSpent')}</p><p className="text-base font-black text-white">{totalPurchased.toLocaleString()}</p></div>
                </div>
                <Link href={`/@${profile?.loginId}/followers`} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-purple-500/30 hover:bg-purple-500/10 transition-all">
                  <Users className="h-5 w-5 shrink-0 text-purple-400" />
                  <div><p className="text-xs text-white/40 font-mono uppercase tracking-wider">{t('userProfile.followers')}</p><p className="text-base font-black text-white">{profile?.followersCount || 0}</p></div>
                </Link>
                <Link href={`/@${profile?.loginId}/following`} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-purple-500/30 hover:bg-purple-500/10 transition-all">
                  <UserPlus className="h-5 w-5 shrink-0 text-purple-400" />
                  <div><p className="text-xs text-white/40 font-mono uppercase tracking-wider">{t('userProfile.following')}</p><p className="text-base font-black text-white">{profile?.followingCount || 0}</p></div>
                </Link>
              </div>

              {/* Verifications */}
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <p className="text-xs text-white/40 font-mono uppercase tracking-wider mb-2">{t('userProfile.verifications')}</p>
                <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
                  {profile?.isPro && <div className="flex items-center gap-1.5 text-yellow-400"><ShieldCheck className="h-4 w-4" /><span>PRO</span></div>}
                  {profile?.isWeb3Verified && <div className="flex items-center gap-1.5 text-blue-400"><Globe className="h-4 w-4" /><span>{t('userProfile.web3')}</span></div>}
                  {profile?.isNftVerified && <div className="flex items-center gap-1.5 text-blue-400"><EthereumIcon className="h-4 w-4 stroke-blue-400" /><span>NFT</span></div>}
                  {profile?.kycStatus === 'Verified' && <div className="flex items-center gap-1.5 text-yellow-400"><Fingerprint className="h-4 w-4" /><span>{t('userProfile.kyc')}</span></div>}
                  {!profile?.isPro && !profile?.isWeb3Verified && !profile?.isNftVerified && profile?.kycStatus !== 'Verified' && (
                    <p className="text-xs text-white/25">{t('userProfile.noVerifications')}</p>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* PRO Dialog Content */}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accountPage.proCertification.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('accountPage.proCertification.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <RadioGroup value={selectedPlan || ''} onValueChange={setSelectedPlan}>
              {['tier1', 'tier2', 'tier3'].map((tier) => (
                <Label key={tier} htmlFor={`pro-${tier}`} className="flex items-center justify-between p-4 border rounded-xl cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary border-white/15 bg-white/[0.03] hover:bg-white/[0.06] transition-all">
                  <div>
                    <h4 className="font-semibold text-white text-sm">{t(`accountPage.proCertification.${tier}.title`)}</h4>
                    <p className="text-xs text-white/50">{t(`accountPage.proCertification.${tier}.description`)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-white">{t(`accountPage.proCertification.${tier}.price`)}</span>
                    <RadioGroupItem value={tier} id={`pro-${tier}`} />
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button onClick={handleUpgrade} disabled={!selectedPlan || isUpgrading}>
              {isUpgrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('accountPage.proCertification.purchaseButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
