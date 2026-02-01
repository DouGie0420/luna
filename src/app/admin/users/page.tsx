'use client';

import { useCollection, useFirestore, useUser } from "@/firebase";
import React, { useMemo, useState } from 'react';
import { collection, query, doc, updateDoc } from "firebase/firestore";
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
        if (field === 'creditScore' || field === 'lunarSoil') {
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
                description: `Could not update ${field}.`
            });
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
                    {users && users.length > 0 ? (
                        users.map(user => (
                            <React.Fragment key={user.uid}>
                                <TableRow>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={user.photoURL} alt={user.displayName} />
                                                <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                            </Avatar>
                                            <p>{user.displayName}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{user.email}</div>
                                        <Select 
                                            value={user.emailVerified ? 'true' : 'false'}
                                            onValueChange={(value) => handleFieldUpdate(user.uid, 'emailVerified', value === 'true')}
                                            disabled={currentUserProfile?.uid === user.uid}
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
                                            disabled={currentUserProfile?.uid === user.uid}
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
                                            disabled={currentUserProfile?.uid === user.uid}
                                        >
                                            <SelectTrigger className="w-[120px] h-10">
                                                <SelectValue placeholder={t('admin.usersPage.setRole')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="guest">guest</SelectItem>
                                                <SelectItem value="user">user</SelectItem>
                                                <SelectItem value="support">support</SelectItem>
                                                <SelectItem value="staff">staff</SelectItem>
                                                <SelectItem value="admin">admin</SelectItem>
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
                                            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                                                <div className="grid gap-2">
                                                    <Label>{t('accountPage.creditLevel')}</Label>
                                                    <Select
                                                        value={user.creditLevel || 'Newcomer'}
                                                        onValueChange={(value) => handleFieldUpdate(user.uid, 'creditLevel', value as CreditLevel)}
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
                                                    <Input id={`score-${user.uid}`} type="number" defaultValue={user.creditScore || 0} onBlur={(e) => handleFieldUpdate(user.uid, 'creditScore', e.target.value)} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor={`soil-${user.uid}`}>月壤 (积分)</Label>
                                                    <Input id={`soil-${user.uid}`} type="number" defaultValue={user.lunarSoil || 0} onBlur={(e) => handleFieldUpdate(user.uid, 'lunarSoil', e.target.value)} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                    <div className="flex items-center gap-2 text-muted-foreground"><ShoppingBag className="h-4 w-4 text-primary" /> {t('accountPage.sales')}: <span className="font-bold text-foreground">{user.salesCount || 0}</span></div>
                                                    <div className="flex items-center gap-2 text-muted-foreground"><ShoppingCart className="h-4 w-4 text-primary" /> {t('accountPage.purchases')}: <span className="font-bold text-foreground">{user.purchasesCount || 0}</span></div>
                                                    <div className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4 text-primary" /> {t('userProfile.followers')}: <span className="font-bold text-foreground">{user.followersCount || 0}</span></div>
                                                    <div className="flex items-center gap-2 text-muted-foreground"><UserPlus className="h-4 w-4 text-primary" /> {t('userProfile.following')}: <span className="font-bold text-foreground">{user.followingCount || 0}</span></div>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        ))
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
