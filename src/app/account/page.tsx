// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation";
import {
    Gem, ShoppingBag, ShoppingCart, Star, Users, UserPlus, ShieldCheck,
    Loader2, CheckCircle, XCircle, Award, Sparkles, Fingerprint, Globe,
    UploadCloud, X, DollarSign, Database, User, Mail, MapPin, FileText,
    Edit3, Copy, Link2, Shield, Zap, Image as ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfile } from "@/lib/user";
import Link from "next/link";
import { getNftsForOwner, SimplifiedNft } from "@/lib/alchemy";
import { NftSelectorDialog } from "@/components/nft-selector-dialog";
import { sendEmailVerification } from "firebase/auth";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { type BadgeType, type Product, type GlobalSettings } from '@/lib/types';
import { AdminBadgeIcon } from "@/components/ui/admin-badge-icon";
import { compressImage } from "@/lib/image-compressor";
import { uploadToR2 } from "@/lib/upload";
import Image from "next/image";
import { motion } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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

const inputCls = "w-full h-11 px-3 rounded-xl bg-white/[0.07] border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.10] transition-all";
const selectCls = "w-full h-11 px-3 rounded-xl bg-white/[0.07] border border-white/15 text-sm text-white focus:outline-none focus:border-purple-500/60 transition-all appearance-none";

function SectionCard({ children, accent = 'purple' }: { children: React.ReactNode; accent?: 'purple' | 'blue' | 'green' | 'yellow' | 'pink' }) {
    const colors: Record<string, string> = {
        purple: 'via-purple-500/40',
        blue: 'via-blue-500/40',
        green: 'via-green-500/40',
        yellow: 'via-yellow-500/40',
        pink: 'via-pink-500/40',
    };
    return (
        <div className="relative rounded-2xl border border-white/12 bg-[#0d0715]/80 overflow-hidden">
            <div className={`h-px w-full bg-gradient-to-r from-transparent ${colors[accent]} to-transparent`} />
            <div className="p-5">{children}</div>
        </div>
    );
}

function SectionHeader({ icon: Icon, title, subtitle, accent = 'purple' }: { icon: React.FC<any>; title: string; subtitle?: string; accent?: string }) {
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
        <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-xl ${bgColors[accent] || bgColors.purple} border flex items-center justify-center shrink-0`}>
                <Icon className={`h-4 w-4 ${iconColors[accent] || iconColors.purple}`} />
            </div>
            <div>
                <h2 className="text-sm font-black text-white leading-none">{title}</h2>
                {subtitle && <p className="text-[10px] text-white/30 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider">{children}</label>;
}

function StatBox({ icon: Icon, label, value, href, iconColor = 'text-purple-400' }: { icon: React.FC<any>; label: string; value: any; href?: string; iconColor?: string }) {
    const inner = (
        <div className={`flex items-center gap-3 p-3 rounded-xl border border-white/12 bg-[#0d0715]/80 ${href ? 'hover:border-purple-500/30 hover:bg-purple-500/10 transition-all' : ''}`}>
            <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
            <div className="min-w-0">
                <p className="text-[10px] text-white/35 font-mono uppercase tracking-wider">{label}</p>
                <p className="text-base font-black text-white leading-none mt-0.5">{value}</p>
            </div>
        </div>
    );
    return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function AccountProfilePage() {
    const { user, profile, loading } = useUser();
    const firestore = useFirestore();
    const { t } = useTranslation();
    const { toast } = useToast();

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

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
        const fetchStats = async () => {
            setLoadingStats(true);
            const ordersRef = collection(firestore, 'orders');
            try {
                const pQ = query(ordersRef, where('buyerId', '==', user.uid), where('status', '==', 'Completed'));
                const pSnap = await getDocs(pQ);
                let spent = 0;
                pSnap.forEach(d => { spent += d.data().totalAmount || 0; });
                setTotalPurchased(spent);
                const sQ = query(ordersRef, where('sellerId', '==', user.uid), where('status', '==', 'Completed'));
                const sSnap = await getDocs(sQ);
                let earned = 0;
                sSnap.forEach(d => { earned += d.data().totalAmount || 0; });
                setTotalSold(earned);
            } catch (e) { console.error(e); }
            finally { setLoadingStats(false); }
        };
        fetchStats();
    }, [firestore, user]);

    const handleSaveChanges = async () => {
        if (!firestore || !user) return;
        try {
            await updateUserProfile(firestore, user.uid, { displayName, gender, location, bio });
            toast({ title: t('accountPage.saveSuccessTitle'), description: t('accountPage.saveSuccessDescription') });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('accountPageNew.updateError'), description: t('accountPageNew.failedToUpdateProfile') });
        }
    };

    const handleSetLoginId = async () => {
        if (!firestore || !user || !newLoginId.trim()) return;
        const RESERVED_IDS = ['admin', 'staff', 'pay', 'root', 'luna'];
        if (RESERVED_IDS.includes(newLoginId.trim().toLowerCase())) {
            toast({ variant: "destructive", title: t('accountPageNew.idUnavailable'), description: t('accountPageNew.idReservedDesc') });
            return;
        }
        if (!/^\d{3,}$/.test(newLoginId)) {
            toast({ variant: "destructive", title: t('accountPageNew.invalidId'), description: t('accountPageNew.invalidIdDesc') });
            return;
        }
        setIsSavingId(true);
        try {
            const q = query(collection(firestore, 'users'), where('loginId', '==', newLoginId));
            const snap = await getDocs(q);
            if (!snap.empty) {
                toast({ variant: "destructive", title: t('accountPageNew.idTaken'), description: t('accountPageNew.idTakenDesc') });
                setIsSavingId(false);
                return;
            }
            await updateUserProfile(firestore, user.uid, { loginId: newLoginId });
            toast({ title: t('accountPageNew.idSetSuccess'), description: t('accountPageNew.idSetSuccessDesc').replace('{id}', newLoginId) });
            setNewLoginId('');
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: t('accountPageNew.idSetFailed'), description: t('accountPageNew.idSetFailedDesc') });
        } finally {
            setIsSavingId(false);
        }
    };

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingBanner(true);
        try {
            const url = await uploadToR2(file, `banners/${user?.uid}`);
            setBannerPreview(url);
        } catch (error: any) {
            toast({ variant: 'destructive', title: t('accountPageNew.uploadError'), description: error.message || t('accountPageNew.failedToUpdateProfile') });
        } finally { setIsUploadingBanner(false); e.target.value = ''; }
    };

    const handleSaveBanner = async () => {
        if (!firestore || !user || !bannerPreview) return;
        setIsUploadingBanner(true);
        try {
            await updateUserProfile(firestore, user.uid, { bannerUrl: bannerPreview });
            toast({ title: t('accountPageNew.bannerUpdated'), description: t('accountPageNew.bannerUpdatedDesc') });
        } catch (e) {
            toast({ variant: 'destructive', title: t('accountPageNew.updateError'), description: t('accountPageNew.failedToUpdateBanner') });
        } finally { setIsUploadingBanner(false); }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingAvatar(true);
        try {
            const url = await uploadToR2(file, `avatars/${user?.uid}`);
            setAvatarPreview(url);
        } catch (error: any) {
            toast({ variant: 'destructive', title: t('accountPageNew.uploadError'), description: error.message || t('accountPageNew.failedToUpdateProfile') });
        } finally { setIsUploadingAvatar(false); e.target.value = ''; }
    };

    const handleSaveAvatar = async () => {
        if (!firestore || !user || !avatarPreview) return;
        setIsUploadingAvatar(true);
        try {
            await updateUserProfile(firestore, user.uid, { photoURL: avatarPreview, isNftVerified: false });
            toast({ title: t('accountPageNew.avatarUpdated'), description: t('accountPageNew.avatarUpdatedDesc') });
        } catch (e) {
            toast({ variant: 'destructive', title: t('accountPageNew.updateError'), description: t('accountPageNew.failedToUpdateAvatar') });
        } finally { setIsUploadingAvatar(false); }
    };

    const handleSendVerification = async () => {
        if (!user || cooldown > 0 || isVerifying) return;
        setIsVerifying(true);
        try {
            await sendEmailVerification(user);
            toast({ title: t('accountPage.verifyEmailSent') });
            setCooldown(60);
        } catch (error: any) {
            toast({ variant: 'destructive', title: t('accountPageNew.updateError'), description: error.message });
        } finally { setIsVerifying(false); }
    };

    const handleSyncNfts = async () => {
        if (!user || !profile?.walletAddress) {
            toast({ variant: 'destructive', title: t('accountPageNew.walletNotLinked'), description: t('accountPageNew.walletNotLinkedDesc') });
            return;
        }
        setIsSyncingNfts(true);
        try {
            setNfts(await getNftsForOwner(profile.walletAddress));
            setIsNftDialogOpen(true);
        } catch (error) {
            toast({ variant: 'destructive', title: t('accountPageNew.nftSyncFailed'), description: t('accountPageNew.nftSyncFailedDesc') });
        } finally { setIsSyncingNfts(false); }
    };

    const handleSetNftAvatar = async (nft: SimplifiedNft) => {
        if (!firestore || !user) return;
        setIsUpdatingAvatar(true);
        try {
            await updateUserProfile(firestore, user.uid, { photoURL: nft.imageUrl, isNftVerified: true });
            toast({ title: t('accountPageNew.nftAvatarUpdated'), description: t('accountPageNew.nftAvatarUpdatedDesc') });
            setIsNftDialogOpen(false);
        } catch {
            toast({ variant: 'destructive', title: t('accountPageNew.nftAvatarFailed'), description: t('accountPageNew.nftAvatarFailedDesc') });
        } finally { setIsUpdatingAvatar(false); }
    };

    const handleUpgrade = async () => {
        if (!firestore || !user || !profile || !selectedPlan) return;
        setIsUpgrading(true);
        try {
            await addDoc(collection(firestore, 'proApplications'), {
                userId: user.uid,
                userName: profile.displayName || user.displayName || 'Anonymous User',
                status: 'pending',
                plan: selectedPlan,
                createdAt: serverTimestamp(),
            });
            toast({ title: t('accountPageNew.proApplicationSubmitted'), description: t('accountPageNew.proApplicationSubmittedDesc') });
            setIsProDialogOpen(false);
            setSelectedPlan(null);
            setHasPendingApplication(true);
        } catch {
            toast({ variant: 'destructive', title: t('accountPageNew.proApplicationFailed'), description: t('accountPageNew.proApplicationFailedDesc') });
        } finally { setIsUpgrading(false); }
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
            <div className="p-4 md:p-5">
                <div className="grid lg:grid-cols-[260px_1fr] gap-4">
                    <Skeleton className="h-80 rounded-2xl bg-white/[0.04]" />
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl bg-white/[0.04]" />)}
                    </div>
                </div>
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
                <div className="p-4 md:p-5 space-y-4">

                        {/* ── Profile Header ── */}
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                        >
                            {/* Profile card — banner fills entire card background */}
                            <div className="relative rounded-2xl border border-white/12 overflow-hidden">
                                {/* Banner as full card background */}
                                {bannerPreview ? (
                                    <Image src={bannerPreview} alt="Banner" fill className="object-cover object-center" />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-pink-900/30 to-blue-900/40" />
                                )}
                                {/* Dark overlay for content readability */}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/50 to-black/80 pointer-events-none" />

                                {/* Banner controls — top right */}
                                {canCustomize && profile?.isPro && (
                                    <div className="absolute top-2.5 right-2.5 flex gap-1.5 z-10">
                                        <label className="relative flex items-center gap-1 h-7 px-3 rounded-lg bg-black/70 backdrop-blur-sm border border-white/25 text-white text-[11px] font-bold cursor-pointer hover:bg-black/90 transition-colors overflow-hidden">
                                            <ImageIcon className="w-3 h-3 pointer-events-none" /><span className="pointer-events-none">{t('accountPageNew.uploadBanner')}</span>
                                            <input type="file" accept="image/*" onChange={handleBannerUpload} disabled={isUploadingBanner} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        </label>
                                        {bannerPreview && bannerPreview !== profile?.bannerUrl && (
                                            <>
                                                <button onClick={handleSaveBanner} disabled={isUploadingBanner} className="flex items-center gap-1 h-7 px-3 rounded-lg bg-purple-600 border border-purple-400/50 text-white text-[11px] font-bold hover:bg-purple-500 transition-colors disabled:opacity-50">
                                                    {isUploadingBanner ? <Loader2 className="w-3 h-3 animate-spin" /> : t('accountPageNew.save')}
                                                </button>
                                                <button onClick={() => setBannerPreview(null)} className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white hover:bg-black/90 transition-colors">
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                                <input ref={bannerInputRef} type="file" className="sr-only" onChange={handleBannerUpload} accept="image/*" disabled={isUploadingBanner} />

                                {/* Content on top of banner */}
                                <div className="relative px-5 pt-8 pb-5 flex flex-col items-center gap-3">
                                    {/* Avatar circle */}
                                    <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/30 shadow-[0_0_24px_rgba(168,85,247,0.4)]">
                                        {avatarPreview ? (
                                            <Image src={avatarPreview} alt="Avatar" fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-purple-500/20 flex items-center justify-center">
                                                <User className="w-8 h-8 text-purple-300/70" />
                                            </div>
                                        )}
                                        {isUploadingAvatar && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                                                <Loader2 className="h-5 w-5 animate-spin text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <input ref={avatarInputRef} type="file" className="sr-only" onChange={handleAvatarUpload} accept="image/*" disabled={isUploadingAvatar} />

                                    {/* Name */}
                                    <div className="text-center">
                                        <p className="font-black text-white text-base leading-none drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">{displayName || t('accountPageNew.nickname')}</p>
                                        {profile?.loginId && profile.loginId !== user?.uid && (
                                            <p className="text-[11px] font-mono text-purple-200/80 mt-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">luna.gift/@{profile.loginId}</p>
                                        )}
                                    </div>

                                    {/* Avatar action buttons */}
                                    {canCustomize && (
                                        <div className="flex gap-2 w-full">
                                            <label className={`relative overflow-hidden ${avatarPreview && avatarPreview !== profile?.photoURL ? 'flex-none px-4' : 'flex-1'} flex items-center justify-center gap-1.5 h-8 rounded-xl bg-black/50 backdrop-blur-sm border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-all text-xs font-semibold cursor-pointer ${isUploadingAvatar ? 'opacity-50 pointer-events-none' : ''}`}>
                                                {isUploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin pointer-events-none" /> : <><UploadCloud className="w-3 h-3 pointer-events-none" /><span className="pointer-events-none">{t('accountPageNew.uploadAvatar')}</span></>}
                                                {!isUploadingAvatar && <input type="file" accept="image/*" onChange={handleAvatarUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />}
                                            </label>
                                            {avatarPreview && avatarPreview !== profile?.photoURL && (
                                                <button onClick={handleSaveAvatar} disabled={isUploadingAvatar} className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl bg-black/50 backdrop-blur-sm border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-all text-xs font-bold disabled:opacity-50">
                                                    {isUploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : t('accountPageNew.saveAvatar')}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* NFT avatar */}
                                    {canCustomize && profile?.isWeb3Verified && (
                                        <button onClick={handleSyncNfts} disabled={isSyncingNfts} className="w-full flex items-center justify-center gap-1.5 h-8 rounded-xl bg-black/50 backdrop-blur-sm border border-blue-400/30 text-blue-200 hover:border-blue-400/60 transition-all text-xs font-semibold disabled:opacity-40">
                                            {isSyncingNfts && <Loader2 className="w-3 h-3 animate-spin" />}
                                            {t('accountPageNew.useNftAvatar')}
                                        </button>
                                    )}

                                    {/* Verification badges */}
                                    <div className="flex flex-wrap justify-center gap-1.5 pt-2 border-t border-white/15 w-full">
                                        {profile?.isPro && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/25 text-yellow-200 border border-yellow-400/40 backdrop-blur-sm">
                                                <ShieldCheck className="w-2.5 h-2.5" />PRO
                                            </span>
                                        )}
                                        {profile?.isWeb3Verified && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/25 text-blue-200 border border-blue-400/40 backdrop-blur-sm">
                                                <Globe className="w-2.5 h-2.5" />Web3
                                            </span>
                                        )}
                                        {profile?.kycStatus === 'Verified' && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/25 text-yellow-200 border border-yellow-400/40 backdrop-blur-sm">
                                                <Fingerprint className="w-2.5 h-2.5" />KYC
                                            </span>
                                        )}
                                        {profile?.emailVerified && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/25 text-green-200 border border-green-400/40 backdrop-blur-sm">
                                                <CheckCircle className="w-2.5 h-2.5" />{t('accountPageNew.emailBadgeLabel')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Lunar Vault */}
                            <div className="relative rounded-2xl border border-white/12 bg-[#0d0715]/80 overflow-hidden">
                                <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
                                <div className="p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center shrink-0">
                                        <Database className="w-5 h-5 text-purple-400 animate-pulse" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-purple-400/60">{t('accountPageNew.lunarVault')}</p>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-3xl font-black text-white drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]">
                                                {profile?.lunarSoil || 0}
                                            </span>
                                            <span className="text-xs font-mono font-bold text-purple-400 uppercase">g</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats quick grid */}
                            <div className="grid grid-cols-2 gap-2">
                                <StatBox icon={Star} label={t('accountPageNew.rating')} value={`${profile?.rating?.toFixed(1) || '0.0'}`} iconColor="text-yellow-400" />
                                <StatBox icon={ShoppingBag} label={t('accountPageNew.onSale')} value={profile?.onSaleCount || 0} href="/account/listings" iconColor="text-purple-400" />
                                <StatBox icon={DollarSign} label={t('accountPageNew.sold')} value={profile?.salesCount || 0} href="/account/sales" iconColor="text-emerald-400" />
                                <StatBox icon={ShoppingCart} label={t('accountPageNew.purchases')} value={profile?.purchasesCount || 0} href="/account/purchases" iconColor="text-blue-400" />
                                <StatBox icon={Users} label={t('accountPageNew.followers')} value={profile?.followersCount || 0} href={`/@${profile?.loginId}/followers`} iconColor="text-purple-400" />
                                <StatBox icon={UserPlus} label={t('accountPageNew.following')} value={profile?.followingCount || 0} href={`/@${profile?.loginId}/following`} iconColor="text-blue-400" />
                            </div>

                        </motion.div>

                        {/* ── Right Column: Forms ── */}
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 }}
                            className="space-y-4"
                        >
                            {/* Basic Info */}
                            <SectionCard accent="purple">
                                <SectionHeader icon={Edit3} title={t('accountPageNew.basicInfo')} subtitle={t('accountPageNew.personalInfoSubtitle')} accent="purple" />
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1.5">
                                        <FieldLabel>{t('accountPageNew.nickname')}</FieldLabel>
                                        <input className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('accountPageNew.nickname')} />
                                    </div>

                                    {/* Login ID */}
                                    {profile && user && profile.loginId === user.uid ? (
                                        <div className="rounded-xl border-2 border-dashed border-purple-500/40 bg-purple-500/5 p-4">
                                            <p className="text-xs font-bold text-purple-300 mb-3">{t('accountPageNew.exclusiveIdNotActivated')}</p>
                                            <div className="flex gap-2">
                                                <input className={inputCls + " flex-1"} placeholder={t('accountPageNew.enterIdPlaceholder')} value={newLoginId} onChange={(e) => setNewLoginId(e.target.value.replace(/[^0-9]/g, ''))} disabled={isSavingId} />
                                                <button onClick={handleSetLoginId} disabled={isSavingId || !newLoginId.trim()} className="flex items-center gap-1.5 h-11 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold disabled:opacity-50 whitespace-nowrap">
                                                    {isSavingId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{t('accountPageNew.activateNow')}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1.5">
                                            <FieldLabel>{t('accountPageNew.exclusiveId')}</FieldLabel>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-11 px-3 rounded-xl bg-white/[0.05] border border-white/12 flex items-center">
                                                    <span className="text-xs font-mono text-white/40">luna.gift/@</span>
                                                    <span className="text-sm text-white font-bold">{profile?.loginId}</span>
                                                </div>
                                                <button onClick={() => { navigator.clipboard.writeText(`https://luna.gift/@${profile?.loginId}`); toast({ title: t('accountPageNew.copyLinkSuccess') }); }} className="flex items-center gap-1.5 h-11 px-3 rounded-xl bg-white/5 border border-white/12 text-white/50 hover:text-purple-300 hover:border-purple-500/30 transition-all text-xs font-semibold whitespace-nowrap">
                                                    <Copy className="w-3.5 h-3.5" />{t('accountPageNew.copyLink')}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Email */}
                                    <div className="flex flex-col gap-1.5">
                                        <FieldLabel>{t('accountPageNew.emailAddress')}</FieldLabel>
                                        <div className="flex gap-2">
                                            <div className="flex-1 h-11 px-3 rounded-xl bg-white/[0.05] border border-white/12 flex items-center gap-2">
                                                <Mail className="w-3.5 h-3.5 text-white/30 shrink-0" />
                                                <span className="text-sm text-white/60 font-mono truncate">{profile?.email || user?.email || ''}</span>
                                                {profile?.emailVerified && <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 ml-auto" />}
                                            </div>
                                            {user && !profile?.emailVerified && (
                                                <button onClick={handleSendVerification} disabled={cooldown > 0 || isVerifying} className="flex items-center gap-1.5 h-11 px-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition-all text-xs font-bold whitespace-nowrap disabled:opacity-50">
                                                    {isVerifying && <Loader2 className="w-3 h-3 animate-spin" />}
                                                    {cooldown > 0 ? `${cooldown}s` : t('accountPage.verifyEmail')}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <FieldLabel>{t('accountPageNew.gender')}</FieldLabel>
                                            <select className={selectCls} value={gender} onChange={(e) => setGender(e.target.value)}>
                                                <option value="男">{t('accountPageNew.genderMale')}</option>
                                                <option value="女">{t('accountPageNew.genderFemale')}</option>
                                                <option value="其他">{t('accountPageNew.genderOther')}</option>
                                                <option value="保密">{t('accountPageNew.genderSecret')}</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <FieldLabel>{t('accountPageNew.region')}</FieldLabel>
                                            <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('accountPageNew.locationPlaceholder')} />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <FieldLabel>{t('accountPageNew.bio')}</FieldLabel>
                                        <textarea className="w-full px-3 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/60 transition-all resize-none" rows={3} maxLength={200} value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t('accountPageNew.bioPlaceholder')} />
                                        <p className="text-[10px] text-white/25 text-right font-mono">{bio.length} / 200</p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.05] border border-white/10">
                                            <span className="text-[10px] text-white/35 uppercase tracking-wider">{t('accountPageNew.kyc')}</span>
                                            <span className={cn("text-xs font-bold", profile?.kycStatus === 'Verified' ? 'text-green-400' : profile?.kycStatus === 'Pending' ? 'text-yellow-400' : 'text-white/40')}>{profile?.kycStatus || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.05] border border-white/10">
                                            <span className="text-[10px] text-white/35 uppercase tracking-wider">{t('accountPageNew.email')}</span>
                                            <span className={cn("text-xs font-bold", profile?.emailVerified ? 'text-green-400' : 'text-red-400/70')}>{profile?.emailVerified ? t('accountPageNew.verified') : t('common.notVerified') || 'Unverified'}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.05] border border-white/10">
                                            <span className="text-[10px] text-white/35 uppercase tracking-wider">{t('accountPageNew.registration')}</span>
                                            <span className="text-xs font-bold text-white/60">{profile?.createdAt?.toDate ? format(profile.createdAt.toDate(), 'yyyy/MM') : 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-1">
                                        <button onClick={handleSaveChanges} className="flex items-center gap-2 h-10 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold hover:opacity-90 transition-all shadow-[0_0_16px_rgba(168,85,247,0.25)]">
                                            {t('accountPageNew.saveChanges')}
                                        </button>
                                    </div>
                                </div>
                            </SectionCard>

                            {/* Badges */}
                            <SectionCard accent="yellow">
                                <div className="flex items-center justify-between mb-4">
                                    <SectionHeader icon={Award} title={t('accountPageNew.badgeDisplay')} subtitle={t('accountPageNew.badgeDisplaySubtitle')} accent="yellow" />
                                    <button onClick={() => handleBadgeSelection('none')} className={cn("flex items-center gap-1.5 h-8 px-3 rounded-xl border text-xs font-bold transition-all", !profile?.displayedBadge || profile.displayedBadge === 'none' ? 'border-purple-500/40 bg-purple-500/15 text-purple-300' : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20')}>
                                        <XCircle className="w-3.5 h-3.5" />{t('accountPageNew.noDisplay')}
                                    </button>
                                </div>
                                {availableBadges.length > 0 ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {availableBadges.map(({ type, label, icon: Icon }) => (
                                            <button key={type} onClick={() => handleBadgeSelection(type)} className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border transition-all", profile?.displayedBadge === type ? 'border-purple-500/50 bg-purple-500/12' : 'border-white/8 bg-white/[0.03] hover:border-white/15')}>
                                                {type === 'pro' ? <span className="text-base font-black text-yellow-300">PRO</span>
                                                    : type === 'admin' ? <AdminBadgeIcon className="h-6 w-6" />
                                                    : <Icon className={cn("h-6 w-6", badgeColors[type as keyof typeof badgeColors])} />}
                                                <span className="text-[10px] font-bold text-white/55">{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-white/25 text-center py-4">{t('accountPageNew.noBadges')}</p>
                                )}
                            </SectionCard>

                            {/* PRO Cert */}
                            <SectionCard accent="yellow">
                                <SectionHeader icon={ShieldCheck} title={t('accountPageNew.proMerchantCert')} subtitle={t('accountPageNew.proCertificationSubtitle')} accent="yellow" />
                                {profile?.isPro ? (
                                    <div className="flex items-center gap-3 p-4 rounded-xl border border-green-500/30 bg-green-500/8">
                                        <ShieldCheck className="h-7 w-7 text-green-400 shrink-0" />
                                        <div>
                                            <h3 className="font-black text-green-300 text-sm">{t('accountPageNew.alreadyPro')}</h3>
                                            <p className="text-xs text-green-400/70 mt-0.5">{t('accountPageNew.alreadyProDesc')}</p>
                                        </div>
                                    </div>
                                ) : hasPendingApplication ? (
                                    <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/8">
                                        <Loader2 className="h-7 w-7 text-yellow-400 animate-spin shrink-0" />
                                        <div>
                                            <h3 className="font-black text-yellow-300 text-sm">{t('accountPageNew.applicationPending')}</h3>
                                            <p className="text-xs text-yellow-400/70 mt-0.5">{t('accountPageNew.applicationPendingDesc')}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <DialogTrigger asChild>
                                            <button className="w-full h-11 rounded-xl bg-gradient-to-r from-yellow-600/80 to-orange-600/80 border border-yellow-500/30 text-white text-sm font-black hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2" disabled={!isProApplicationEnabled || settingsLoading}>
                                                {settingsLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                                {t('accountPage.proCertification.applyButton')}
                                            </button>
                                        </DialogTrigger>
                                        {!isProApplicationEnabled && !settingsLoading && (
                                            <p className="text-[11px] text-white/25 text-center mt-2">{t('accountPageNew.proApplicationDisabled')}</p>
                                        )}
                                    </>
                                )}
                            </SectionCard>

                            {/* Featured Product (PRO only) */}
                            {profile?.isPro && (
                                <SectionCard accent="green">
                                    <SectionHeader icon={Zap} title={t('accountPageNew.featuredProductDisplay')} subtitle={t('accountPageNew.featuredProductSubtitle')} accent="green" />
                                    <div className="flex flex-col gap-1.5">
                                        <FieldLabel>{t('accountPageNew.selectFeaturedProduct')}</FieldLabel>
                                        {productsLoading ? <Skeleton className="h-11 rounded-xl bg-white/[0.03]" /> : (
                                            <select className={selectCls} value={profile.featuredProductId || 'none'} onChange={async (e) => { if (!firestore || !user) return; const val = e.target.value; await updateUserProfile(firestore, user.uid, { featuredProductId: val === 'none' ? null : val }); toast({ title: t('accountPageNew.featuredProductUpdated') }); }}>
                                                <option value="none">{t('accountPageNew.noDisplay')}</option>
                                                {userProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        )}
                                        <p className="text-[11px] text-white/25 mt-1">{t('accountPageNew.featuredProductHint')}</p>
                                    </div>
                                </SectionCard>
                            )}
                        </motion.div>
                </div>

                {/* PRO Dialog */}
                <DialogContent className="bg-[#0d0715]/95 border border-white/10 backdrop-blur-3xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white">{t('accountPage.proCertification.dialogTitle')}</DialogTitle>
                        <DialogDescription className="text-white/45">{t('accountPage.proCertification.dialogDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        {['tier1', 'tier2', 'tier3'].map((tier) => (
                            <button key={tier} onClick={() => setSelectedPlan(tier)} className={cn("w-full flex items-center justify-between p-4 rounded-xl border transition-all", selectedPlan === tier ? 'border-purple-500/50 bg-purple-500/12' : 'border-white/8 bg-white/[0.03] hover:border-white/15')}>
                                <div className="text-left">
                                    <h4 className="font-bold text-sm text-white">{t(`accountPage.proCertification.${tier}.title`)}</h4>
                                    <p className="text-xs text-white/40 mt-0.5">{t(`accountPage.proCertification.${tier}.description`)}</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-4">
                                    <span className="font-black text-base text-purple-300">{t(`accountPage.proCertification.${tier}.price`)}</span>
                                    <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0", selectedPlan === tier ? 'border-purple-400 bg-purple-500' : 'border-white/25')}>
                                        {selectedPlan === tier && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                    <DialogFooter>
                        <button onClick={handleUpgrade} disabled={!selectedPlan || isUpgrading} className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                            {isUpgrading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {t('accountPage.proCertification.purchaseButton')}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
