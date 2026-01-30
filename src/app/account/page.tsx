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
import { Gem, ShoppingBag, ShoppingCart, Star, Copy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfile } from "@/lib/user";

export default function AccountProfilePage() {
    const { user, profile, loading } = useUser();
    const firestore = useFirestore();
    const { t } = useTranslation();
    const { toast } = useToast();

    const [displayName, setDisplayName] = useState('');
    const [gender, setGender] = useState('保密');
    const [location, setLocation] = useState('');
    const [bio, setBio] = useState('');

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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
