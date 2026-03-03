// @ts-nocheck
'use client';

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState, useEffect, useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/hooks/use-translation";
import { Gem, ShoppingBag, ShoppingCart, Star, Users, UserPlus, ShieldCheck, Loader2, CheckCircle, XCircle, Award, Sparkles, Fingerprint, Globe, UploadCloud, X, Languages, DollarSign, Database } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1.75l-6.172 9.5L12 17.5l6.172-6.25L12 1.75z"/>
        <path d="M5.828 12.5L12 22.25l6.172-9.75L12 17.5 5.828 12.5z"/>
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

    useEffect(() => {
        if (fetchedProducts) {
            setUserProducts(fetchedProducts);
        }
    }, [fetchedProducts]);


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
        const q = query(
            collection(firestore, 'proApplications'),
            where('userId', '==', user.uid),
            where('status', '==', 'pending')
        );
        getDocs(q).then(snapshot => {
            if (!snapshot.empty) {
                setHasPendingApplication(true);
            }
        });
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
                purchasesSnapshot.forEach(doc => {
                    totalSpent += doc.data().totalAmount || 0;
                });
                setTotalPurchased(totalSpent);

                const salesQuery = query(ordersRef, where('sellerId', '==', user.uid), where('status', '==', 'Completed'));
                const salesSnapshot = await getDocs(salesQuery);
                let totalEarned = 0;
                salesSnapshot.forEach(doc => {
                    totalEarned += doc.data().totalAmount || 0;
                });
                setTotalSold(totalEarned);
            } catch(e) {
                console.error("Error fetching transaction stats:", e);
            } finally {
                setLoadingStats(false);
            }
        };

        fetchTransactionStats();
    }, [firestore, user]);


    const handleSaveChanges = async () => {
        if (!firestore || !user) return;
        const dataToUpdate = {
            displayName,
            gender,
            location,
            bio,
        };
        try {
            await updateUserProfile(firestore, user.uid, dataToUpdate);
            toast({
                title: t('accountPage.saveSuccessTitle'),
                description: t('accountPage.saveSuccessDescription'),
            })
        } catch(e) {
            console.error(e);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to update profile.'
            })
        }
    };
    
    const handleSetLoginId = async () => {
        if (!firestore || !user || !newLoginId.trim()) return;

        const RESERVED_IDS = ['admin', 'staff', 'pay', 'root', 'luna'];
        if (RESERVED_IDS.includes(newLoginId.trim().toLowerCase())) {
            toast({
                variant: "destructive",
                title: 'ID不可用',
                description: '此专属ID为系统保留，请选择其他ID。',
            });
            return;
        }
        
        if (!/^\d{3,}$/.test(newLoginId)) {
            toast({
                variant: "destructive",
                title: '无效的专属ID',
                description: 'ID必须是3位或更长的纯数字。',
            });
            return;
        }

        setIsSavingId(true);
        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('loginId', '==', newLoginId));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                toast({
                    variant: "destructive",
                    title: 'ID已被占用',
                    description: '此专属ID已被其他用户使用，请更换。',
                });
                setIsSavingId(false);
                return;
            }

            await updateUserProfile(firestore, user.uid, { loginId: newLoginId });
            toast({
                title: '专属ID设置成功！',
                description: `您的新专属ID是 @${newLoginId}`,
            });
            setNewLoginId('');
        } catch (error) {
            console.error('Failed to set Login ID:', error);
            toast({
                variant: 'destructive',
                title: '设置失败',
                description: '更新您的ID时出错，请稍后再试。',
            });
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
            console.error('Banner compression error:', error);
            toast({
                variant: 'destructive',
                title: 'Image Error',
                description: error.message || 'Failed to process image. Please try another file.',
            });
        } finally {
            setIsUploadingBanner(false);
        }
    };

    const handleSaveBanner = async () => {
        if (!firestore || !user || !bannerPreview) return;
        setIsUploadingBanner(true);
        try {
            await updateUserProfile(firestore, user.uid, { bannerUrl: bannerPreview });
            toast({
                title: "横幅已更新",
                description: "您的自定义商户横幅已保存。",
            });
        } catch (e) {
            console.error(e);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to update banner.'
            });
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
            console.error('Avatar compression error:', error);
            toast({
                variant: 'destructive',
                title: 'Image Error',
                description: error.message || 'Failed to process image. Please try another file.',
            });
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleSaveAvatar = async () => {
        if (!firestore || !user || !avatarPreview) return;
        setIsUploadingAvatar(true);
        try {
            await updateUserProfile(firestore, user.uid, { photoURL: avatarPreview, isNftVerified: false });
            toast({
                title: "头像已更新",
                description: "您的新头像已保存。",
            });
        } catch (e) {
            console.error(e);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to update avatar.'
            });
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
            toast({
                variant: 'destructive',
                title: 'Wallet Not Linked',
                description: 'Please link your wallet first to verify NFT assets.'
            });
            return;
        }
        setIsSyncingNfts(true);
        try {
            const ownerNfts = await getNftsForOwner(profile.walletAddress);
            setNfts(ownerNfts);
            setIsNftDialogOpen(true);
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Failed to sync NFTs',
                description: 'Could not fetch NFT data. Please check your wallet connection or Alchemy setup.'
            })
        } finally {
            setIsSyncingNfts(false);
        }
    };
    
    const handleSetNftAvatar = async (nft: SimplifiedNft) => {
        if (!firestore || !user) return;
        setIsUpdatingAvatar(true);
        const dataToUpdate = {
            photoURL: nft.imageUrl,
            isNftVerified: true,
        };
        try {
            await updateUserProfile(firestore, user.uid, dataToUpdate);
            toast({
                title: 'Avatar Updated!',
                description: 'Your profile picture is now your NFT.'
            });
            setIsNftDialogOpen(false);
        } catch (error) {
            console.error(error);
             toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: 'Could not set NFT as avatar.'
            })
        } finally {
            setIsUpdatingAvatar(false);
        }
    };
    
    const handleUpgrade = async () => {
        if (!firestore || !user || !profile || !selectedPlan) return;
        setIsUpgrading(true);
        try {
            const applicationData = {
                userId: user.uid,
                userName: profile.displayName || user.displayName || 'Anonymous User',
                status: 'pending' as const,
                plan: selectedPlan,
                createdAt: serverTimestamp(),
            };
            await addDoc(collection(firestore, 'proApplications'), applicationData);
            
            toast({ title: "申请已提交", description: "您的PRO商户申请已提交审核，请耐心等待。" });
            setIsProDialogOpen(false);
            setSelectedPlan(null);
            setHasPendingApplication(true);
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: '申请失败', description: '发生未知错误，请稍后再试。' });
        } finally {
            setIsUpgrading(false);
        }
    }


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
        const badge = value as BadgeType;
        await updateUserProfile(firestore, user.uid, { displayedBadge: badge });
        toast({ title: t('accountPage.badges.update_success') });
    };

    const canCustomize = profile?.isPro || ['admin', 'ghost', 'staff', 'support'].includes(profile?.role || '');


    if (loading || loadingStats) {
        return (
            <div className="p-6 md:p-8 lg:p-12">
                <h1 className="text-3xl font-headline mb-6"><Skeleton className="h-8 w-48" /></h1>
                <div className="grid gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle><Skeleton className="h-6 w-1/3" /></CardTitle>
                            <CardDescription><Skeleton className="h-4 w-2/3" /></CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <Skeleton className="h-10 w-24" />
                        </CardFooter>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle><Skeleton className="h-6 w-1/3" /></CardTitle>
                            <CardDescription><Skeleton className="h-4 w-2/3" /></CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                             <Skeleton className="h-24 w-full" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <>
        <style jsx global>{`
            .titanium-title { font-family: 'Playfair Display', serif; letter-spacing: -0.02em; }
        `}</style>
        
        <NftSelectorDialog 
            open={isNftDialogOpen}
            onOpenChange={setIsNftDialogOpen}
            nfts={nfts}
            onSelect={handleSetNftAvatar}
            isUpdating={isUpdatingAvatar}
        />
        <Dialog open={isProDialogOpen} onOpenChange={setIsProDialogOpen}>
            <div className="p-6 md:p-8 lg:p-12 max-w-7xl mx-auto">
                <h1 className="text-3xl font-black titanium-title italic uppercase mb-8 text-white">System <span className="text-primary">Profile</span></h1>
                
                <div className="grid gap-8">
                    
                    {/* 🚀 新增：顶级视觉 - Lunar Vault 月壤金库面板 */}
                    <Card className="bg-black/60 backdrop-blur-2xl border border-primary/30 shadow-[0_0_40px_rgba(168,85,247,0.15)] relative overflow-hidden group">
                        {/* 动态光效背景 */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full filter blur-[80px] group-hover:bg-primary/20 transition-all duration-700" />
                        
                        <CardContent className="p-8 md:p-10 relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                {/* 发光的数据库图标 */}
                                <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/50 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)] group-hover:scale-105 transition-transform duration-500">
                                    <Database className="w-10 h-10 text-primary animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-sm font-black uppercase tracking-[0.4em] text-primary/70 drop-shadow-md">Lunar Vault / 月壤金库</p>
                                    <div className="flex items-baseline gap-3 mt-1">
                                        <span className="text-6xl font-black titanium-title text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                            {profile?.lunarSoil || 0}
                                        </span>
                                        <span className="text-xl font-mono font-bold text-primary uppercase tracking-widest">Grams</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="hidden md:flex flex-col items-end space-y-2 border-l border-white/10 pl-8">
                                <p className="text-xs font-mono text-white/40 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-3 h-3 text-yellow-400" /> Active Protocol</p>
                                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] max-w-[200px] text-right">Accumulate Lunar Soil through transactions, likes, and positive evaluations.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('accountPage.personalInfo')}</CardTitle>
                            <CardDescription>{t('accountPage.personalInfoDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="full-name">{t('accountPage.fullName')}</Label>
                                <Input id="full-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                            </div>
                            
                            {profile && user && profile.loginId === user.uid ? (
                                <div className="border-2 border-dashed border-primary/50 p-4 rounded-lg bg-primary/5">
                                    <p className="text-sm text-primary mb-2 italic">检测到您尚未激活专属赛博域名</p>
                                    <div className="flex gap-2">
                                    <Input 
                                        placeholder="输入3位以上数字..." 
                                        value={newLoginId}
                                        onChange={(e) => setNewLoginId(e.target.value.replace(/[^0-9]/g, ''))}
                                        disabled={isSavingId}
                                    />
                                    <Button onClick={handleSetLoginId} disabled={isSavingId || !newLoginId.trim()}>
                                        {isSavingId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        立即激活
                                    </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    <Label>专属ID</Label>
                                    <div className="flex items-center gap-2">
                                        <Input value={`@${profile?.loginId}`} readOnly className="border-dashed" />
                                        <Button variant="outline" size="sm" onClick={() => {
                                            navigator.clipboard.writeText(`https://luna.io/@${profile?.loginId}`);
                                            toast({ title: '已复制您的专属链接！' });
                                        }}>复制链接</Button>
                                    </div>
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label htmlFor="email">{t('accountPage.email')}</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        id="email" 
                                        type="email" 
                                        value={profile?.email || user?.email || ''} 
                                        readOnly 
                                        className={cn(
                                            "text-muted-foreground", 
                                            profile?.emailVerified && "border-dashed border-muted-foreground/30 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 cursor-default"
                                        )}
                                    />
                                    {user && !profile?.emailVerified && (
                                        <Button type="button" onClick={handleSendVerification} disabled={cooldown > 0 || isVerifying}>
                                            {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            {cooldown > 0 ? `${t('accountPage.resendIn')} ${cooldown}s` : t('accountPage.verifyEmail')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="gender">{t('accountPage.gender')}</Label>
                                    <Select value={gender} onValueChange={setGender}>
                                        <SelectTrigger id="gender">
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
                                <div className="grid gap-2">
                                    <Label htmlFor="location">{t('accountPage.location')}</Label>
                                    <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('accountPage.locationPlaceholder')} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="bio">{t('accountPage.bio')}</Label>
                                <Textarea
                                    id="bio"
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder={t('accountPage.bioPlaceholder')}
                                    rows={3}
                                    maxLength={200}
                                />
                                <p className="text-xs text-muted-foreground text-right">{bio.length} / 200</p>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label>{t('accountPage.kycStatus')}</Label>
                                    <Badge variant={
                                        profile?.kycStatus === "Verified" ? "default" :
                                        profile?.kycStatus === "Pending" ? "secondary" :
                                        "destructive"
                                    }>{profile?.kycStatus || 'N/A'}</Badge>
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('accountPage.emailVerification')}</Label>
                                    {profile?.emailVerified ? (
                                        <div className="flex items-center pt-2">
                                            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                                            <span className="text-sm text-muted-foreground">{t('accountPage.emailVerifiedStatus.verified')}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center pt-2">
                                            <XCircle className="h-5 w-5 text-destructive mr-2" />
                                            <span className="text-sm text-muted-foreground">{t('accountPage.emailVerifiedStatus.notVerified')}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('accountPage.joinedOn')}</Label>
                                    <p className="text-sm text-muted-foreground pt-2">
                                        {profile?.createdAt?.toDate ? format(profile.createdAt.toDate(), 'PPP') : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <Button onClick={handleSaveChanges}>{t('accountPage.saveChanges')}</Button>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle>{t('accountPage.badges.title')}</CardTitle>
                                <CardDescription>{t('accountPage.badges.description')}</CardDescription>
                            </div>
                            <Button
                                variant={!profile?.displayedBadge || profile.displayedBadge === 'none' ? 'default' : 'outline'}
                                onClick={() => handleBadgeSelection('none')}
                                className="flex-shrink-0"
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                {t('accountPage.badges.no_display')}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {availableBadges.length > 0 ? (
                                <RadioGroup
                                    value={profile?.displayedBadge || 'none'}
                                    onValueChange={handleBadgeSelection}
                                    className="grid grid-cols-2 md:grid-cols-3 gap-4"
                                >
                                    {availableBadges.map(({ type, label, icon: Icon }) => (
                                        <Label key={type} htmlFor={`badge-${type}`} className="flex flex-col items-center justify-center gap-2 p-4 border rounded-lg cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/50 transition-all">
                                            <RadioGroupItem value={type} id={`badge-${type}`} className="sr-only" />
                                            {type === 'pro' ? (
                                                <div className="relative h-8 w-8 flex items-center justify-center">
                                                    <span className="font-headline text-[8px] text-yellow-300 drop-shadow-lg">PRO</span>
                                                </div>
                                            ) : type === 'admin' ? (
                                                <AdminBadgeIcon className="h-8 w-8" />
                                            ) : (
                                                <Icon className={cn("h-8 w-8", badgeColors[type as keyof typeof badgeColors])} />
                                            )}
                                            <span className="font-semibold">{label}</span>
                                        </Label>
                                    ))}
                                </RadioGroup>
                            ) : (
                                <p className="text-muted-foreground text-center p-4">{t('accountPage.badges.no_badges')}</p>
                            )}
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('accountPage.proCertification.title')}</CardTitle>
                            <CardDescription>{t('accountPage.proCertification.description')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {profile?.isPro ? (
                                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/50">
                                    <ShieldCheck className="h-8 w-8 text-green-400"/>
                                    <div>
                                        <h3 className="font-semibold text-green-300">{t('accountPage.proCertification.alreadyPro')}</h3>
                                        <p className="text-sm text-green-400/80">您已解锁所有PRO商户特权。</p>
                                    </div>
                                </div>
                            ) : hasPendingApplication ? (
                                <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/50">
                                    <Loader2 className="h-8 w-8 text-yellow-400 animate-spin"/>
                                    <div>
                                        <h3 className="font-semibold text-yellow-300">您的 PRO 申请正在审核中</h3>
                                        <p className="text-sm text-yellow-400/80">我们会在审核完成后通知您。</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                <DialogTrigger asChild>
                                    <Button size="lg" className="w-full h-12 text-lg font-bold" disabled={!isProApplicationEnabled || settingsLoading}>
                                        {settingsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {t('accountPage.proCertification.applyButton')}
                                    </Button>
                                </DialogTrigger>
                                {!isProApplicationEnabled && !settingsLoading && (
                                    <p className="text-xs text-muted-foreground text-center mt-2">
                                        PRO认证申请功能当前已由管理员关闭。
                                    </p>
                                )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {canCustomize && (
                        <Card>
                            <CardHeader>
                                <CardTitle>自定义头像</CardTitle>
                                <CardDescription>
                                    作为认证商户或管理员，您可以上传新头像和商户横幅。
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-8">
                                {/* Avatar Upload */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                    <div className="md:col-span-1 grid gap-2">
                                        <Label htmlFor="avatar-upload">上传新头像</Label>
                                        <p className="text-xs text-muted-foreground">点击按键以上传新头像。</p>
                                    </div>
                                    <div className="md:col-span-2 grid gap-4">
                                        <label htmlFor="avatar-upload" className="cursor-pointer w-fit">
                                            <div className="relative h-24 w-24">
                                                {avatarPreview ? (
                                                    <Image src={avatarPreview} alt="Avatar Preview" fill className="rounded-full object-cover border-2 border-primary" />
                                                ) : (
                                                    <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                                                        <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                                    </div>
                                                )}
                                                {isUploadingAvatar && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                        <input id="avatar-upload" type="file" className="sr-only" onChange={handleAvatarUpload} accept="image/*" disabled={isUploadingAvatar} />
                                        <Button onClick={handleSaveAvatar} disabled={isUploadingAvatar || !avatarPreview || avatarPreview === profile?.photoURL} className="w-fit">
                                            {isUploadingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            保存头像
                                        </Button>
                                    </div>
                                </div>

                                {profile?.isPro && <Separator />}
                                
                                {/* Banner Upload */}
                                {profile?.isPro && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                        <div className="md:col-span-1 grid gap-2">
                                            <Label htmlFor="banner-upload">自定义商户横幅</Label>
                                            <p className="text-xs text-muted-foreground">推荐尺寸: 1080x432. 将展示在您的公开资料页和认证商户列表中。</p>
                                        </div>
                                        <div className="md:col-span-2 grid gap-4">
                                            {bannerPreview ? (
                                                <div className="relative aspect-[1080/432] w-full">
                                                    <Image src={bannerPreview} alt="Banner Preview" fill className="object-cover rounded-md border bg-muted/20" />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                                                        onClick={() => setBannerPreview(null)}
                                                        disabled={isUploadingBanner}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <label htmlFor="banner-upload" className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors">
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                                                        <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                                        <p className="text-xs text-muted-foreground"><span className="font-semibold">点击上传</span> 或拖拽</p>
                                                    </div>
                                                    <input id="banner-upload" type="file" className="sr-only" onChange={handleBannerUpload} accept="image/*" disabled={isUploadingBanner} />
                                                </label>
                                            )}
                                            {isUploadingBanner && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> 正在处理图片...</p>}
                                            <Button onClick={handleSaveBanner} disabled={isUploadingBanner || !bannerPreview} className="w-fit">
                                                {isUploadingBanner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                保存横幅
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}


                    {profile?.isPro && (
                        <Card>
                            <CardHeader>
                                <CardTitle>精选商品展示</CardTitle>
                                <CardDescription>
                                    选择一件您的商品，它将被展示在首页“认证商户”区域您的名片下方。
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                            <div className="grid gap-2">
                                    <Label htmlFor="featured-product-select">选择精选商品</Label>
                                    {productsLoading ? <Skeleton className="h-10 w-full" /> : (
                                        <Select 
                                            value={profile.featuredProductId || 'none'}
                                            onValueChange={async (value) => {
                                                if (!firestore || !user) return;
                                                const newFeaturedId = value === 'none' ? null : value;
                                                await updateUserProfile(firestore, user.uid, { featuredProductId: newFeaturedId });
                                                toast({ title: "精选商品已更新" });
                                            }}
                                        >
                                            <SelectTrigger id="featured-product-select">
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
                            </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Crypto Wallet</CardTitle>
                            <CardDescription>将您的数字资产展示在月之女神的静谧中</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={handleSyncNfts} disabled={isSyncingNfts || !profile?.isWeb3Verified}>
                                {isSyncingNfts && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                验证 NFT 资产
                            </Button>
                            {!profile?.isWeb3Verified && (
                                <p className="text-xs text-muted-foreground mt-2">请先使用钱包登录以启用此功能。</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('accountPage.creditTitle')}</CardTitle>
                            <CardDescription>{t('accountPage.creditDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="flex items-center gap-4 p-4 bg-accent/50 rounded-lg animate-glow">
                                <Gem className="h-10 w-10 text-primary" />
                                <div className="flex-1">
                                    <p className="text-sm text-muted-foreground">{t('accountPage.creditLevel')}</p>
                                    <p className="text-2xl font-bold">{profile?.creditLevel || 'Newcomer'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">{t('accountPage.creditScore')}</p>
                                    <p className="text-2xl font-bold">{profile?.creditScore || 0}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                                    <Star className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('accountPage.rating')}</p>
                                        <p className="font-bold">
                                            {profile?.rating?.toFixed(1) || '0.0'} 
                                            <span className="text-xs text-muted-foreground font-normal"> ({profile?.reviewsCount || 0} {t('accountPage.reviews')})</span>
                                        </p>
                                    </div>
                                </div>
                                <Link href="/account/listings" className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors group">
                                    <div className="flex items-center gap-3 p-3">
                                        <ShoppingBag className="h-6 w-6 text-primary" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('sellerProfile.onSale')}</p>
                                            <p className="font-bold group-hover:underline">{profile?.onSaleCount || 0}</p>
                                        </div>
                                    </div>
                                </Link>
                                <Link href="/account/sales" className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors group">
                                    <div className="flex items-center gap-3 p-3">
                                        <DollarSign className="h-6 w-6 text-primary" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('accountPage.sales')}</p>
                                            <p className="font-bold group-hover:underline">{profile?.salesCount || 0}</p>
                                        </div>
                                    </div>
                                </Link>
                                <Link href="/account/purchases" className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors group">
                                    <div className="flex items-center gap-3 p-3">
                                        <ShoppingCart className="h-6 w-6 text-primary" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('accountPage.purchases')}</p>
                                            <p className="font-bold group-hover:underline">{profile?.purchasesCount || 0}</p>
                                        </div>
                                    </div>
                                </Link>
                                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                                    <DollarSign className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('accountPage.totalSold')}</p>
                                        <p className="font-bold">{totalSold.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                                    <DollarSign className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('accountPage.totalSpent')}</p>
                                        <p className="font-bold">{totalPurchased.toLocaleString()}</p>
                                    </div>
                                </div>
                                <Link href={`/@${profile?.loginId}/followers`} className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors group">
                                    <div className="flex items-center gap-3 p-3">
                                        <Users className="h-6 w-6 text-primary" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('userProfile.followers')}</p>
                                            <p className="font-bold group-hover:underline">{profile?.followersCount || 0}</p>
                                        </div>
                                    </div>
                                </Link>
                                <Link href={`/@${profile?.loginId}/following`} className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors group">
                                    <div className="flex items-center gap-3 p-3">
                                        <UserPlus className="h-6 w-6 text-primary" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('userProfile.following')}</p>
                                            <p className="font-bold group-hover:underline">{profile?.followingCount || 0}</p>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                            <div className="p-3 bg-secondary/30 rounded-lg flex flex-col justify-center">
                                <p className="text-sm text-muted-foreground mb-2">{t('userProfile.verifications')}</p>
                                <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
                                    {profile?.isPro && (
                                        <div className="flex items-center gap-1.5 text-yellow-400">
                                            <ShieldCheck className="h-4 w-4" />
                                            <span>PRO</span>
                                        </div>
                                    )}
                                    {profile?.isWeb3Verified && (
                                        <div className="flex items-center gap-1.5 text-blue-400">
                                            <Globe className="h-4 w-4" />
                                            <span>{t('userProfile.web3')}</span>
                                        </div>
                                    )}
                                    {profile?.isNftVerified && (
                                        <div className="flex items-center gap-1.5 text-blue-400">
                                            <EthereumIcon className="h-4 w-4 stroke-blue-400" />
                                            <span>NFT</span>
                                        </div>
                                    )}
                                    {profile?.kycStatus === 'Verified' && (
                                        <div className="flex items-center gap-1.5 text-yellow-400">
                                            <Fingerprint className="h-4 w-4" />
                                            <span>{t('userProfile.kyc')}</span>
                                        </div>
                                    )}
                                    {!profile?.isPro && !profile?.isWeb3Verified && !profile?.isNftVerified && profile?.kycStatus !== 'Verified' && (
                                        <p className="text-xs text-muted-foreground">{t('userProfile.noVerifications')}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('accountPage.proCertification.dialogTitle')}</DialogTitle>
                    <DialogDescription>{t('accountPage.proCertification.dialogDescription')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <RadioGroup value={selectedPlan || ''} onValueChange={(value) => setSelectedPlan(value)}>
                        <Label htmlFor="pro-tier1" className="flex items-center justify-between p-4 border rounded-lg cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
                            <div>
                                <h4 className="font-semibold">{t('accountPage.proCertification.tier1.title')}</h4>
                                <p className="text-sm text-muted-foreground">{t('accountPage.proCertification.tier1.description')}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-lg">{t('accountPage.proCertification.tier1.price')}</span>
                                <RadioGroupItem value="tier1" id="pro-tier1" />
                            </div>
                        </Label>
                        <Label htmlFor="pro-tier2" className="flex items-center justify-between p-4 border rounded-lg cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
                            <div>
                                <h4 className="font-semibold">{t('accountPage.proCertification.tier2.title')}</h4>
                                <p className="text-sm text-muted-foreground">{t('accountPage.proCertification.tier2.description')}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-lg">{t('accountPage.proCertification.tier2.price')}</span>
                                <RadioGroupItem value="tier2" id="pro-tier2" />
                            </div>
                        </Label>
                        <Label htmlFor="pro-tier3" className="flex items-center justify-between p-4 border rounded-lg cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
                            <div>
                                <h4 className="font-semibold">{t('accountPage.proCertification.tier3.title')}</h4>
                                <p className="text-sm text-muted-foreground">{t('accountPage.proCertification.tier3.description')}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-lg">{t('accountPage.proCertification.tier3.price')}</span>
                                <RadioGroupItem value="tier3" id="pro-tier3" />
                            </div>
                        </Label>
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
    )
}