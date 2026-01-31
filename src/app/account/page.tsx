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
import { Gem, ShoppingBag, ShoppingCart, Star, Copy, Users, UserPlus, ShieldCheck, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfile } from "@/lib/user";
import Link from "next/link";
import { getNftsForOwner, SimplifiedNft } from "@/lib/alchemy";
import { NftSelectorDialog } from "@/components/nft-selector-dialog";

export default function AccountProfilePage() {
    const { user, profile, loading } = useUser();
    const firestore = useFirestore();
    const { t } = useTranslation();
    const { toast } = useToast();

    const [displayName, setDisplayName] = useState('');
    const [gender, setGender] = useState('保密');
    const [location, setLocation] = useState('');
    const [bio, setBio] = useState('');

    const [isSyncingNfts, setIsSyncingNfts] = useState(false);
    const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
    const [nfts, setNfts] = useState<SimplifiedNft[]>([]);
    const [isNftDialogOpen, setIsNftDialogOpen] = useState(false);

    useEffect(() => {
        if (profile) {
            setDisplayName(profile.displayName || '');
            setGender(profile.gender || '保密');
            setLocation(profile.location || '');
            setBio(profile.bio || '');
        }
    }, [profile]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: t('accountPage.copied'),
        });
    };

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

    const handleSyncNfts = async () => {
        if (!user) return;
        setIsSyncingNfts(true);
        try {
            const ownerNfts = await getNftsForOwner(user.uid);
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="full-name">{t('accountPage.fullName')}</Label>
                                <Input id="full-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="user-id">{t('accountPage.userId')}</Label>
                                <div className="flex gap-2">
                                    <Input id="user-id" value={user?.uid || ''} readOnly className="text-muted-foreground" />
                                    <Button variant="outline" size="icon" onClick={() => handleCopy(user?.uid || '')}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-2">
                                <Label htmlFor="email">{t('accountPage.email')}</Label>
                                <Input id="email" type="email" value={profile?.email || user?.email || ''} readOnly className="text-muted-foreground" />
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
                                <Label>{t('accountPage.joinedOn')}</Label>
                                <p className="text-sm text-muted-foreground pt-2">
                                    {profile?.createdAt?.toDate ? format(profile.createdAt.toDate(), 'PPP') : 'N/A'}
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('accountPage.lastLogin')}</Label>
                                <p className="text-sm text-muted-foreground pt-2">
                                    {profile?.lastLogin?.toDate ? format(profile.lastLogin.toDate(), 'PPP p') : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button onClick={handleSaveChanges}>{t('accountPage.saveChanges')}</Button>
                    </CardFooter>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Web3 档案</CardTitle>
                        <CardDescription>将您的数字资产与 LUNA 档案同步。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleSyncNfts} disabled={isSyncingNfts || !profile?.isWeb3Verified}>
                            {isSyncingNfts && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            同步 NFT 资产
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
                                    <p className="text-sm text-muted-foreground">{t('accountPage.sales')}</p>
                                    <p className="font-bold">{profile?.salesCount || 0}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                                <ShoppingCart className="h-6 w-6 text-primary" />
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('accountPage.purchases')}</p>
                                    <p className="font-bold">{profile?.purchasesCount || 0}</p>
                                </div>
                            </div>
                            <Link href={`/user/${user?.uid}/followers`} className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                                <div className="flex items-center gap-3 p-3">
                                    <Users className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('userProfile.followers')}</p>
                                        <p className="font-bold">{profile?.followersCount || 0}</p>
                                    </div>
                                </div>
                            </Link>
                            <Link href={`/user/${user?.uid}/following`} className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
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
                                        <div className="flex items-center gap-1.5 text-green-400">
                                            <ShieldCheck className="h-4 w-4" />
                                            <span>{t('userProfile.pro')}</span>
                                        </div>
                                    )}
                                    {profile?.isWeb3Verified && (
                                        <div className="flex items-center gap-1.5 text-blue-400">
                                            <ShieldCheck className="h-4 w-4" />
                                            <span>{t('userProfile.web3')}</span>
                                        </div>
                                    )}
                                     {profile?.isNftVerified && (
                                        <div className="flex items-center gap-1.5 text-purple-400">
                                            <ShieldCheck className="h-4 w-4" />
                                            <span>NFT</span>
                                        </div>
                                    )}
                                    {profile?.kycStatus === 'Verified' && (
                                        <div className="flex items-center gap-1.5 text-cyan-400">
                                            <ShieldCheck className="h-4 w-4" />
                                            <span>{t('userProfile.kyc')}</span>
                                        </div>
                                    )}
                                    {!profile?.isPro && !profile?.isWeb3Verified && !profile.isNftVerified && profile?.kycStatus !== 'Verified' && (
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
