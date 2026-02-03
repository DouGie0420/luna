'use client';

import { useCollection, useFirestore, useUser } from "@/firebase";
import React, { useMemo, useState } from 'react';
import { collection, query, doc, updateDoc, getDocs, where } from "firebase/firestore";
import type { UserProfile, KycStatus } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MoreHorizontal, Gem, Users, UserPlus, ShoppingCart, ShoppingBag } from "lucide-react"
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type UserRole = NonNullable<UserProfile['role']>;
type CreditLevel = NonNullable<UserProfile['creditLevel']>;

export default function AdminUsersPage() {
    const { profile: currentUserProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useTranslation();
    const usersQuery = useMemo(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const { data: users, loading } = useCollection<UserProfile>(usersQuery);

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        if (!searchTerm) return users;
        const lowercasedTerm = searchTerm.toLowerCase();
        return users.filter(user =>
            user.displayName?.toLowerCase().includes(lowercasedTerm) ||
            user.email?.toLowerCase().includes(lowercasedTerm) ||
            user.loginId?.toLowerCase().includes(lowercasedTerm)
        );
    }, [users, searchTerm]);

    const toggleRow = (uid: string) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(uid)) {
                newSet.delete(uid);
            } else {
                newSet.add(uid);
            }
            return newSet;
        });
    };

    const handleFieldUpdate = async (uid: string, field: string, value: any) => {
        if (!firestore || currentUserProfile?.uid === uid) return;

        let processedValue = value;
        if (['creditScore', 'lunarSoil'].includes(field)) {
            processedValue = Number(value);
            if (isNaN(processedValue)) {
                toast({ variant: "destructive", title: 'Invalid Input', description: 'Please enter a valid number.' });
                return;
            }
        }

        const userRef = doc(firestore, "users", uid);
        try {
            await updateDoc(userRef, { [field]: processedValue });
            toast({ 
                title: `${field.charAt(0).toUpperCase() + field.slice(1)} Updated`, 
                description: `User ${uid.slice(0, 6)}... ${field} set to ${processedValue}.` 
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
        if (!firestore) return;

        if (!/^\d{3,}$/.test(newLoginId)) {
            toast({
                variant: "destructive",
                title: '无效的专属ID',
                description: 'ID必须是3位或更长的纯数字。',
            });
            // We can't easily revert the input value with defaultValue, but the user will be notified.
            // A page refresh would fix the visual state if needed.
            return;
        }

        const user = users?.find(u => u.uid === uid);
        if (user?.loginId === newLoginId) {
            return; // No change
        }

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
                title: '专属ID已更新',
                description: `用户 ${uid.slice(0, 6)}... 的新ID为 @${newLoginId}.`,
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
        );
    }
    
    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">{t('admin.usersPage.title')}</h2>
            <div className="mb-4 max-w-lg">
                <Input
                    placeholder="按昵称、邮箱或专属ID搜索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12"
                />
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('admin.usersPage.user')}</TableHead>
                        <TableHead>{t('admin.usersPage.email')}</TableHead>
                        <TableHead>{t('admin.usersPage.kycStatus')}</TableHead>
                        <TableHead>{t('admin.usersPage.joined')}</TableHead>
                        <TableHead>{t('admin.usersPage.role')}</TableHead>
                        <TableHead className="text-right">{t('admin.usersPage.actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredUsers && filteredUsers.length > 0 ? (
                        filteredUsers.map(user => {
                            const isSelf = currentUserProfile?.uid === user.uid;
                            const isTargetAdmin = ['admin', 'ghost'].includes(user.role || '');
                            const isRequesterStaffOrSupport = ['staff', 'support'].includes(currentUserProfile?.role || '');

                            // Staff and Support cannot modify anything for high-level admins.
                            // General admins cannot modify other admins or ghosts.
                            // Ghosts can modify anyone except themselves.
                            let modificationDisabled = isSelf;
                            if (isRequesterStaffOrSupport && isTargetAdmin) {
                                modificationDisabled = true;
                            }
                            if (currentUserProfile?.role === 'admin' && isTargetAdmin) {
                                modificationDisabled = true;
                            }
                            
                            // Only super admins can edit the critical loginId.
                            const canEditLoginId = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'ghost';
                            const loginIdModificationDisabled = isSelf || !canEditLoginId || isSubmitting || (currentUserProfile?.role === 'admin' && isTargetAdmin);

                            return (
                            <React.Fragment key={user.uid}>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={user.photoURL} alt={user.displayName} />
                                                <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p>{user.displayName}</p>
                                                <p className="font-mono text-xs text-muted-foreground">@{user.loginId}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{user.email}</div>
                                        <Select 
                                            value={user.emailVerified ? 'true' : 'false'}
                                            onValueChange={(value) => handleFieldUpdate(user.uid, 'emailVerified', value === 'true')}
                                            disabled={modificationDisabled || isSubmitting}
                                        >
                                            <SelectTrigger className="w-[120px] mt-1 h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">
                                                    <Badge variant="default" className="border-green-500/50 bg-green-500/20 text-green-300">Verified</Badge>
                                                </SelectItem>
                                                <SelectItem value="false">
                                                    <Badge variant="destructive" className="border-red-500/50 bg-red-500/20 text-red-300">Not Verified</Badge>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={user.kycStatus}
                                            onValueChange={(value: KycStatus) => handleFieldUpdate(user.uid, 'kycStatus', value)}
                                            disabled={modificationDisabled || isSubmitting}
                                        >
                                            <SelectTrigger className="w-[120px] h-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Verified">Verified</SelectItem>
                                                <SelectItem value="Not Verified">Not Verified</SelectItem>
                                                <SelectItem value="Pending">Pending</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        {user.createdAt?.toDate ? format(user.createdAt.toDate(), 'yyyy/MM/dd') : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Select 
                                            defaultValue={user.role || 'guest'} 
                                            onValueChange={(value: UserRole) => handleFieldUpdate(user.uid, 'role', value)}
                                            disabled={modificationDisabled || isSubmitting}
                                        >
                                            <SelectTrigger className="w-[120px] h-10">
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
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => toggleRow(user.uid)}>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                {expandedIds.has(user.uid) && (
                                    <TableRow className="bg-secondary/20 hover:bg-secondary/30">
                                        <TableCell colSpan={6} className="p-0">
                                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                                
                                                {/* Column 1: Credit & ID */}
                                                <div className="space-y-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor={`loginId-${user.uid}`}>专属ID</Label>
                                                        <Input 
                                                            id={`loginId-${user.uid}`} 
                                                            defaultValue={user.loginId} 
                                                            onBlur={(e) => handleLoginIdUpdate(user.uid, e.target.value)}
                                                            disabled={loginIdModificationDisabled}
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
                                                    <div className="grid gap-2">
                                                        <Label>{t('admin.usersPage.web3Verified')}</Label>
                                                        <Select 
                                                            value={user.isWeb3Verified ? 'true' : 'false'}
                                                            onValueChange={(value) => handleFieldUpdate(user.uid, 'isWeb3Verified', value === 'true')}
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
                                                        <Label>{t('admin.usersPage.nftVerified')}</Label>
                                                        <Select 
                                                            value={user.isNftVerified ? 'true' : 'false'}
                                                            onValueChange={(value) => handleFieldUpdate(user.uid, 'isNftVerified', value === 'true')}
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
                                                </div>

                                                {/* Column 3: Stats & Actions */}
                                                <div className="space-y-4">
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Stats</Label>
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mt-2">
                                                            <div className="flex items-center gap-2 text-muted-foreground"><ShoppingBag className="h-4 w-4 text-primary" /> {t('accountPage.sales')}: <span className="font-bold text-foreground">{user.salesCount || 0}</span></div>
                                                            <div className="flex items-center gap-2 text-muted-foreground"><ShoppingCart className="h-4 w-4 text-primary" /> {t('accountPage.purchases')}: <span className="font-bold text-foreground">{user.purchasesCount || 0}</span></div>
                                                            <div className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4 text-primary" /> {t('userProfile.followers')}: <span className="font-bold text-foreground">{user.followersCount || 0}</span></div>
                                                            <div className="flex items-center gap-2 text-muted-foreground"><UserPlus className="h-4 w-4 text-primary" /> {t('userProfile.following')}: <span className="font-bold text-foreground">{user.followingCount || 0}</span></div>
                                                        </div>
                                                    </div>
                                                    <Separator />
                                                    <div>
                                                        <div className="flex gap-2">
                                                            <Button variant="outline" disabled>{t('admin.usersPage.resetPassword')}</Button>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span tabIndex={0}>
                                                                            <Button variant="outline" disabled>{t('admin.usersPage.viewPassword')}</Button>
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>{t('admin.usersPage.viewPasswordNotImplemented')}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-2">{t('admin.usersPage.resetPasswordNotImplemented')}</p>
                                                    </div>
                                                </div>

                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        )})
                    ) : (
                         <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                {t('admin.usersPage.noUsers')}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
