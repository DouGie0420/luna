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
import { useUser, useFirestore } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/hooks/use-translation";
import { Gem, ShoppingBag, ShoppingCart, Star, Users, UserPlus, ShieldCheck, Loader2, CheckCircle, XCircle, Award, Sparkles, Fingerprint, Globe, UploadCloud, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfile } from "@/lib/user";
import Link from "next/link";
import { getNftsForOwner, SimplifiedNft } from "@/lib/alchemy";
import { NftSelectorDialog } from "@/components/nft-selector-dialog";
import { sendEmailVerification } from "firebase/auth";
import { cn } from "@/lib/utils";
import { type BadgeType } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AdminBadgeIcon } from "@/components/ui/admin-badge-icon";
import { compressImage } from "@/lib/image-compressor";
import Image from "next/image";

const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1.75l-6.172 9.5L12 17.5l6.172-6.25L12 1.75z"/>
        <path d="M5.828 12.5L12 22.25l6.172-9.75L12 17.5 5.828 12.5z"/>
    </svg>
);

const badgeIcons: Record<Exclude<BadgeType, 'none' | 'pro' | 'email' | 'admin'>, React.FC<{ className?: string }>> = {
    kyc: (props) => <Fingerprint {...props} />,
    web3: (props) => <Globe {...props} />,
    nft: (props) => <EthereumIcon {...props} />,
    influencer: (props) => <Award {...props} />,
    contributor: (props) => <Sparkles {...props} />,
};

const badgeColors: Record<Exclude<BadgeType, 'none' | 'pro' | 'email' | 'admin'>, string> = {
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

    const [isSyncingNfts, setIsSyncingNfts] = useState(false);
    const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
    const [nfts, setNfts] = useState<SimplifiedNft[]>([]);
    const [isNftDialogOpen, setIsNftDialogOpen] = useState(false);

    const [isVerifying, setIsVerifying] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (profile) {
            setDisplayName(profile.displayName || '');
            setGender(profile.gender || '保密');
            setLocation(profile.location || '');
            setBio(profile.bio || '');
            setBannerPreview(profile.bannerUrl || null);
        }
    }, [profile]);
    
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

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

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingBanner(true);
        try {
            const compressedDataUrl = await compressImage(file);
            setBannerPreview(compressedDataUrl);
        } catch (error) {
            console.error('Banner compression error:', error);
            toast({
                variant: 'destructive',
                title: 'Image Error',
                description: 'Failed to process image. Please try another file.',
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

    if (loading) {
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
        <NftSelectorDialog 
            open={isNftDialogOpen}
            onOpenChange={setIsNftDialogOpen}
            nfts={nfts}
            onSelect={handleSetNftAvatar}
            isUpdating={isUpdatingAvatar}
        />
        <div className="p-6 md:p-8 lg:p-12">
            <h1 className="text-3xl font-headline mb-6">{t('accountPage.title')}</h1>
            <div className="grid gap-8">
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
                
                {profile?.isPro && (
                    <Card>
                        <CardHeader>
                            <CardTitle>自定义商户横幅</CardTitle>
                            <CardDescription>
                                作为认证商户，您可以上传自定义横幅，该横幅将展示在首页的“认证商户”区域。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="banner-upload">横幅图片 (推荐尺寸: 1080x432)</Label>
                                {bannerPreview ? (
                                    <div className="relative aspect-[1080/432] w-full max-w-lg">
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
                                    <label htmlFor="banner-upload" className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                                            <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">点击上传</span> 或拖拽文件到此</p>
                                            <p className="text-xs text-muted-foreground">PNG, JPG, GIF</p>
                                        </div>
                                        <input id="banner-upload" type="file" className="sr-only" onChange={handleBannerUpload} accept="image/*" disabled={isUploadingBanner} />
                                    </label>
                                )}
                                {isUploadingBanner && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> 正在处理图片...</p>}
                            </div>
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <Button onClick={handleSaveBanner} disabled={isUploadingBanner || !bannerPreview}>
                                {isUploadingBanner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                保存横幅
                            </Button>
                        </CardFooter>
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
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                             <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                                <ShoppingBag className="h-6 w-6 text-primary" />
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('sellerProfile.onSale')}</p>
                                    <p className="font-bold">{profile?.onSaleCount || 0}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                                <ShoppingCart className="h-6 w-6 text-primary" />
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('accountPage.purchases')}</p>
                                    <p className="font-bold">{profile?.purchasesCount || 0}</p>
                                </div>
                            </div>
                            <Link href={`/u/${profile?.loginId}/followers`} className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                                <div className="flex items-center gap-3 p-3">
                                    <Users className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('userProfile.followers')}</p>
                                        <p className="font-bold">{profile?.followersCount || 0}</p>
                                    </div>
                                </div>
                            </Link>
                            <Link href={`/u/${profile?.loginId}/following`} className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                                <div className="flex items-center gap-3 p-3">
                                    <UserPlus className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('userProfile.following')}</p>
                                        <p className="font-bold">{profile?.followingCount || 0}</p>
                                    </div>
                                </div>
                            </Link>
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
                                    {/* 修复点在这里：添加了问号 ?. 避免空指针错误 */}
                                    {!profile?.isPro && !profile?.isWeb3Verified && !profile?.isNftVerified && profile?.kycStatus !== 'Verified' && (
                                        <p className="text-xs text-muted-foreground">{t('userProfile.noVerifications')}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        </>
    )
}
