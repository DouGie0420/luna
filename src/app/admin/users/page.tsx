// @ts-nocheck
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
import { Loader2, MoreHorizontal, AlertCircle, Search } from "lucide-react"
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { AdminUserDetailPanel } from "@/components/admin-user-detail-panel";

type UserRole = NonNullable<UserProfile['role']>;

export default function AdminUsersPage() {
    const { profile: currentUserProfile } = useUser();
    const firestore = useFirestore();
    const { t } = useTranslation();
    const usersQuery = useMemo(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const { data: users, loading } = useCollection<UserProfile>(usersQuery);
    const { toast } = useToast();

    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [verifyingId, setVerifyingId] = useState<string | null>(null);

    const handleVerificationToggle = async (userToUpdate: UserProfile) => {
        if (!firestore || verifyingId) return;
        setVerifyingId(userToUpdate.uid);
        const userRef = doc(firestore, 'users', userToUpdate.uid);
        try {
            await updateDoc(userRef, { emailVerified: !userToUpdate.emailVerified });
            toast({ title: 'Verification status updated' });
        } catch (error) {
            console.error("Failed to toggle verification:", error);
            toast({ variant: 'destructive', title: 'Update Failed' });
        } finally {
            setVerifyingId(null);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        if (!searchTerm) return users;
        const lowercasedTerm = searchTerm.toLowerCase();
        return users.filter(user =>
            user.displayName?.toLowerCase().includes(lowercasedTerm) ||
            user.email?.toLowerCase().includes(lowercasedTerm) ||
            user.loginId?.toLowerCase().includes(lowercasedTerm) ||
            user.uid?.toLowerCase().includes(lowercasedTerm)
        );
    }, [users, searchTerm]);

    const toggleRow = (uid: string) => {
        setExpandedId(prev => prev === uid ? null : uid);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
        );
    }
    
    // According to new requirements, 'support' role cannot list users.
    if (currentUserProfile?.role === 'support') {
         return (
             <div>
                <h2 className="text-3xl font-headline mb-6">{t('admin.usersPage.title')}</h2>
                 <div className="p-10 border border-yellow-500/20 rounded-lg bg-yellow-500/5 text-center">
                    <AlertCircle className="h-10 w-10 text-yellow-400 mx-auto mb-4" />
                    <h2 className="text-yellow-300 font-bold">权限受限</h2>
                    <p className="text-sm mt-2 text-muted-foreground">您的角色 ({currentUserProfile.role}) 只能通过精确搜索 (UID, 邮箱) 查看特定用户，无权浏览完整列表。</p>
                    <div className="mt-6 max-w-md mx-auto">
                        <Input
                            placeholder="输入用户的UID或邮箱进行精确搜索..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-12"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">{t('admin.usersPage.title')}</h2>
            <div className="mb-4 max-w-lg relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="按昵称、邮箱、UID或专属ID搜索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 pl-10"
                />
            </div>
            <div className="border rounded-lg">
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
                            filteredUsers.map(user => (
                                <React.Fragment key={user.uid}>
                                    <TableRow className="cursor-pointer" onClick={() => toggleRow(user.uid)}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={user.photoURL} alt={user.displayName} />
                                                    <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p>{user.displayName}</p>
                                                    <div className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                                                        <span>@{user.loginId}</span>
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
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{user.email}</div>
                                             <Button
                                                variant={user.emailVerified ? 'default' : 'destructive'}
                                                className={cn('h-auto py-0.5 px-2 text-xs', user.emailVerified ? "border-green-500/50 bg-green-500/20 text-green-300 hover:bg-green-500/30" : "border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30")}
                                                onClick={(e) => { e.stopPropagation(); handleVerificationToggle(user); }}
                                                disabled={verifyingId === user.uid}
                                            >
                                                {verifyingId === user.uid ? <Loader2 className="h-3 w-3 animate-spin" /> : (user.emailVerified ? 'Verified' : 'Not Verified')}
                                            </Button>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                user.kycStatus === 'Verified' ? 'default' :
                                                user.kycStatus === 'Pending' ? 'secondary' :
                                                'destructive'
                                            } className={cn(
                                                 user.kycStatus === 'Verified' && "border-green-500/50 bg-green-500/20 text-green-300",
                                                 user.kycStatus === 'Pending' && "border-yellow-500/50 bg-yellow-500/20 text-yellow-300"
                                            )}>
                                                {user.kycStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.createdAt?.toDate ? format(user.createdAt.toDate(), 'yyyy/MM/dd') : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{user.role || 'guest'}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    {expandedId === user.uid && (
                                        <TableRow className="bg-secondary/20 hover:bg-secondary/30">
                                            <TableCell colSpan={6} className="p-0">
                                                <AdminUserDetailPanel user={user} currentUserProfile={currentUserProfile} />
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
        </div>
    )
}
