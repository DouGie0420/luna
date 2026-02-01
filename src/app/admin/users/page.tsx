'use client';

import { useCollection, useFirestore, useUser } from "@/firebase";
import { useMemo } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MoreHorizontal } from "lucide-react"
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type UserRole = NonNullable<UserProfile['role']>;
type CreditLevel = NonNullable<UserProfile['creditLevel']>;

export default function AdminUsersPage() {
    const { profile: currentUserProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useTranslation();
    const usersQuery = useMemo(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const { data: users, loading } = useCollection<UserProfile>(usersQuery);

    const handleFieldUpdate = async (uid: string, field: string, value: any) => {
        if (!firestore || currentUserProfile?.uid === uid) return;

        const userRef = doc(firestore, "users", uid);
        try {
            await updateDoc(userRef, { [field]: value });
            toast({ 
                title: `${field.charAt(0).toUpperCase() + field.slice(1)} Updated`, 
                description: `User ${uid.slice(0, 6)}... ${field} set to ${value}.` 
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
                            <TableRow key={user.uid}>
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
                                        <SelectTrigger className="w-[120px] mt-1">
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
                                        <SelectTrigger className="w-[120px]">
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
                                        <SelectTrigger className="w-[120px]">
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
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>More Actions</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>
                                                    <span>Set Credit Level</span>
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuPortal>
                                                    <DropdownMenuSubContent>
                                                        <DropdownMenuRadioGroup 
                                                            value={user.creditLevel || 'Newcomer'}
                                                            onValueChange={(value) => handleFieldUpdate(user.uid, 'creditLevel', value as CreditLevel)}
                                                        >
                                                            <DropdownMenuRadioItem value="Newcomer">Newcomer</DropdownMenuRadioItem>
                                                            <DropdownMenuRadioItem value="Bronze">Bronze</DropdownMenuRadioItem>
                                                            <DropdownMenuRadioItem value="Silver">Silver</DropdownMenuRadioItem>
                                                            <DropdownMenuRadioItem value="Gold">Gold</DropdownMenuRadioItem>
                                                            <DropdownMenuRadioItem value="Platinum">Platinum</DropdownMenuRadioItem>
                                                            <DropdownMenuRadioItem value="Diamond">Diamond</DropdownMenuRadioItem>
                                                        </DropdownMenuRadioGroup>
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuPortal>
                                            </DropdownMenuSub>
                                            <DropdownMenuItem disabled>
                                                <span>Edit Credit Score (soon)</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem disabled>
                                                <span>{t('admin.usersPage.resetPassword')}</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
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
