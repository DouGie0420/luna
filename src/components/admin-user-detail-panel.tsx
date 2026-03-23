
'use client';

import React, { useState } from 'react';
import type { UserProfile } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { doc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { ShoppingBag, ShoppingCart, Users, UserPlus, AlertCircle, Award } from 'lucide-react';

type UserRole = NonNullable<UserProfile['role']>;
type CreditLevel = NonNullable<UserProfile['creditLevel']>;

interface AdminUserDetailPanelProps {
  user: UserProfile;
  currentUserProfile: UserProfile | null;
}

export function AdminUserDetailPanel({ user, currentUserProfile }: AdminUserDetailPanelProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useTranslation();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- PERMISSION LOGIC ---
    const isSelf = currentUserProfile?.uid === user.uid;
    const isTargetAdmin = ['admin', 'ghost'].includes(user.role || '');
    const currentUserRole = currentUserProfile?.role;
    
    // General modification permissions (for most fields)
    let modificationDisabled = isSelf || currentUserRole === 'support';
    if (currentUserRole === 'staff' && isTargetAdmin) {
        modificationDisabled = true;
    }
    if (currentUserRole === 'admin' && isTargetAdmin) {
        modificationDisabled = true;
    }
    if (currentUserRole === 'ghost' && user.role === 'ghost') {
        modificationDisabled = isSelf; // Ghost can edit another ghost unless it's themself.
    }

    // Stricter permissions for loginId
    let loginIdModificationDisabled = true;
    if (currentUserRole === 'ghost' && !isSelf) {
        loginIdModificationDisabled = false;
    } else if (currentUserRole === 'admin' && !isSelf && !isTargetAdmin) {
        loginIdModificationDisabled = false;
    }

    // --- HANDLERS ---
    const handleFieldUpdate = async (uid: string, field: string, value: any) => {
        if (!firestore || modificationDisabled) return;

        let processedValue = value;
        if (['creditScore', 'lunarSoil', 'salesCount', 'purchasesCount', 'displayPriority'].includes(field)) {
            processedValue = Number(value);
            if (isNaN(processedValue)) {
                toast({ variant: "destructive", title: 'Invalid Input', description: 'Please enter a valid number.' });
                return;
            }
        }

        const getFieldName = (fieldKey: string): string => {
            const key = `admin.userFields.${fieldKey}`;
            const translated = t(key);
            // If translation not found, fallback to a formatted field name
            return translated === key ? fieldKey.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()) : translated;
        };

        const userRef = doc(firestore, "users", uid);
        try {
            await updateDoc(userRef, { [field]: processedValue });
            toast({ 
                title: t('admin.usersPage.updateSuccessTitle'),
                description: t('admin.usersPage.updateSuccessDescription', {
                    fieldName: getFieldName(field),
                    userName: user.displayName,
                    value: String(processedValue)
                })
            });
        } catch (error) {
            console.error(`Failed to update ${field}:`, error);
            toast({ 
                variant: "destructive", 
                title: 'Update Failed', 
                description: `Could not update ${field}. Check console for details.`
            });
        }
    };

    const handleLoginIdUpdate = async (uid: string, newLoginId: string) => {
        if (!firestore || loginIdModificationDisabled) return;

        if (!/^\d{3,}$/.test(newLoginId)) {
            toast({
                variant: "destructive",
                title: '无效的专属ID',
                description: 'ID必须是3位或更长的纯数字。',
            });
            return;
        }

        if (user?.loginId === newLoginId) return; // No change

        setIsSubmitting(true);
        try {
            const q = query(collection(firestore, 'users'), where('loginId', '==', newLoginId));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty && querySnapshot.docs[0].id !== uid) {
                toast({
                    variant: "destructive",
                    title: 'ID已被占用',
                    description: '此专属ID已被其他用户使用，请更换。',
                });
                return;
            }
            
            const userRef = doc(firestore, "users", uid);
            await updateDoc(userRef, { loginId: newLoginId });
            toast({
                title: t('admin.usersPage.updateSuccessTitle'),
                description: t('admin.usersPage.updateSuccessDescription', {
                    fieldName: t('admin.userFields.loginId'),
                    userName: user.displayName,
                    value: `@${newLoginId}`
                })
            });
        } catch (error) {
            console.error("Failed to update loginId:", error);
            toast({
                variant: "destructive",
                title: '更新失败',
                description: "无法更新ID，请检查您的权限或网络连接。"
            });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            
            {/* Column 1: Credit & ID */}
            <div className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor={`loginId-${user.uid}`} className="flex items-center gap-1.5">
                        专属ID 
                        {user.loginId && !/^\d{3,}$/.test(user.loginId) && (
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger>
                                    <AlertCircle className="h-3 w-3 text-red-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>旧格式ID，建议清理为纯数字</p>
                                </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </Label>
                    <Input 
                        id={`loginId-${user.uid}`} 
                        defaultValue={user.loginId} 
                        onBlur={(e) => handleLoginIdUpdate(user.uid, e.target.value)}
                        disabled={loginIdModificationDisabled || isSubmitting}
                        className={cn(!loginIdModificationDisabled && "border-primary/50 ring-primary/20 focus-visible:ring-primary")}
                    />
                </div>
                <Separator />
                <div className="grid gap-2">
                    <Label>{t('accountPage.creditLevel')}</Label>
                    <Select
                        value={user.creditLevel || 'Newcomer'}
                        onValueChange={(value) => handleFieldUpdate(user.uid, 'creditLevel', value as CreditLevel)}
                        disabled={modificationDisabled || isSubmitting}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Newcomer">Newcomer</SelectItem>
                            <SelectItem value="Bronze">Bronze</SelectItem>
                            <SelectItem value="Silver">Silver</SelectItem>
                            <SelectItem value="Gold">Gold</SelectItem>
                            <SelectItem value="Platinum">Platinum</SelectItem>
                            <SelectItem value="Diamond">Diamond</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor={`score-${user.uid}`}>{t('accountPage.creditScore')}</Label>
                    <Input id={`score-${user.uid}`} type="number" defaultValue={user.creditScore || 0} onBlur={(e) => handleFieldUpdate(user.uid, 'creditScore', e.target.value)} disabled={modificationDisabled || isSubmitting} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor={`soil-${user.uid}`}>月壤 (积分)</Label>
                    <Input id={`soil-${user.uid}`} type="number" defaultValue={user.lunarSoil || 0} onBlur={(e) => handleFieldUpdate(user.uid, 'lunarSoil', e.target.value)} disabled={modificationDisabled || isSubmitting} />
                </div>
            </div>

            {/* Column 2: Verifications */}
            <div className="space-y-4">
                 <div className="grid gap-2">
                    <Label>角色</Label>
                    <Select 
                        defaultValue={user.role || 'guest'} 
                        onValueChange={(value: UserRole) => handleFieldUpdate(user.uid, 'role', value)}
                        disabled={modificationDisabled || isSubmitting}
                    >
                        <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder={t('admin.usersPage.setRole')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="guest">guest</SelectItem>
                            <SelectItem value="user">user</SelectItem>
                            <SelectItem value="support">support</SelectItem>
                            <SelectItem value="staff">staff</SelectItem>
                            {currentUserProfile?.role === 'ghost' && <SelectItem value="admin">admin</SelectItem>}
                            {currentUserProfile?.role === 'ghost' && <SelectItem value="ghost">ghost</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>{t('admin.usersPage.proStatus')}</Label>
                    <Select 
                        value={user.isPro ? 'true' : 'false'}
                        onValueChange={(value) => handleFieldUpdate(user.uid, 'isPro', value === 'true')}
                        disabled={modificationDisabled || isSubmitting}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="true">{t('admin.usersPage.proStatusYes')}</SelectItem>
                            <SelectItem value="false">{t('admin.usersPage.proStatusNo')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Separator />
                <Label className="text-xs text-muted-foreground">{t('admin.usersPage.manualBadges')}</Label>
                <div className="grid gap-2">
                    <Label>{t('accountPage.badges.influencer_label')}</Label>
                    <Select
                        value={user.isInfluencer ? 'true' : 'false'}
                        onValueChange={(value) => handleFieldUpdate(user.uid, 'isInfluencer', value === 'true')}
                        disabled={modificationDisabled || isSubmitting}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="true">{t('admin.usersPage.proStatusYes')}</SelectItem>
                            <SelectItem value="false">{t('admin.usersPage.proStatusNo')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>{t('accountPage.badges.contributor_label')}</Label>
                    <Select
                        value={user.isContributor ? 'true' : 'false'}
                        onValueChange={(value) => handleFieldUpdate(user.uid, 'isContributor', value === 'true')}
                        disabled={modificationDisabled || isSubmitting}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="true">{t('admin.usersPage.proStatusYes')}</SelectItem>
                            <SelectItem value="false">{t('admin.usersPage.proStatusNo')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Separator />
                <div className="grid gap-2">
                    <Label htmlFor={`priority-${user.uid}`} className="flex items-center gap-2 text-xs text-muted-foreground"><Award className="h-4 w-4" /> 商户优先展示</Label>
                    <Select
                        value={String(user.displayPriority || 0)}
                        onValueChange={(value) => handleFieldUpdate(user.uid, 'displayPriority', Number(value))}
                        disabled={modificationDisabled || isSubmitting}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">无</SelectItem>
                            <SelectItem value="50">优先展示 (Top 10)</SelectItem>
                            <SelectItem value="10">普通推荐 (Top 50)</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">在“所有认证商户”页面设置展示优先级。</p>
                </div>
            </div>

            {/* Column 3: Stats & Actions */}
            <div className="space-y-4">
                <div>
                    <Label className="text-xs text-muted-foreground">交易统计</Label>
                    <div className="space-y-2 text-sm mt-2">
                        <div className="grid gap-2">
                            <Label htmlFor={`sales-${user.uid}`} className="text-muted-foreground flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-primary" /> {t('accountPage.sales')}</Label>
                            <Input id={`sales-${user.uid}`} type="number" defaultValue={user.salesCount || 0} onBlur={(e) => handleFieldUpdate(user.uid, 'salesCount', e.target.value)} disabled={modificationDisabled || isSubmitting} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor={`purchases-${user.uid}`} className="text-muted-foreground flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" /> {t('accountPage.purchases')}</Label>
                            <Input id={`purchases-${user.uid}`} type="number" defaultValue={user.purchasesCount || 0} onBlur={(e) => handleFieldUpdate(user.uid, 'purchasesCount', e.target.value)} disabled={modificationDisabled || isSubmitting} />
                        </div>
                         <div className="grid gap-2">
                            <Label className="text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> {t('userProfile.followers')}</Label>
                            <div className="h-10 px-3 flex items-center rounded-md border border-white/10 bg-background/30 text-sm text-muted-foreground select-none">
                                {user.followersCount ?? (user.followers?.length || 0)}
                                <span className="ml-2 text-[10px] text-white/20 uppercase tracking-wider">auto-sync</span>
                            </div>
                        </div>
                         <div className="grid gap-2">
                            <Label className="text-muted-foreground flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> {t('userProfile.following')}</Label>
                            <div className="h-10 px-3 flex items-center rounded-md border border-white/10 bg-background/30 text-sm text-muted-foreground select-none">
                                {user.followingCount ?? (user.following?.length || 0)}
                                <span className="ml-2 text-[10px] text-white/20 uppercase tracking-wider">auto-sync</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
