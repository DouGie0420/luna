'use client';

import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, doc, updateDoc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MoreHorizontal } from "lucide-react"
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

type UserRole = NonNullable<UserProfile['role']>;

const roleHierarchy = {
    admin: 3,
    staff: 2,
    support: 1,
    user: 0
}

export default function AdminUsersPage() {
    const { profile: currentUserProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useTranslation();
    const usersQuery = firestore ? query(collection(firestore, 'users')) : null;
    const { data: users, loading } = useCollection<UserProfile>(usersQuery);

    const handleRoleChange = async (uid: string, role: UserRole) => {
      if (!firestore || !role) return;
      
      const userRef = doc(firestore, "users", uid);
      try {
        await updateDoc(userRef, { role });
        toast({ 
            title: t('admin.usersPage.roleUpdated'), 
            description: t('admin.usersPage.roleUpdatedDesc', { uid: uid.slice(0, 6), role }) 
        });
      } catch (error) {
        console.error("Failed to update role:", error);
        toast({ 
            variant: "destructive", 
            title: t('admin.usersPage.updateFailed'), 
            description: t('admin.usersPage.updateFailedDesc')
        });
      }
    };
    
    const visibleUsers = useMemo(() => {
        if (!users || !currentUserProfile?.role) return [];

        const currentUserLevel = roleHierarchy[currentUserProfile.role] || 0;

        if (currentUserProfile.role === 'admin') {
            return users;
        }

        return users.filter(user => {
            const userLevel = roleHierarchy[user.role || 'user'] || 0;
            return currentUserLevel > userLevel;
        });

    }, [users, currentUserProfile]);

    if (loading) {
        return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    const renderRoleCell = (user: UserProfile) => {
      const userRole = user.role || 'user';

      if (currentUserProfile?.role === 'admin') {
        // Admins can edit anyone's role, including other admins
        return (
          <Select defaultValue={userRole} onValueChange={(value: UserRole) => handleRoleChange(user.uid, value)}>
              <SelectTrigger className="w-[120px]" disabled={currentUserProfile.uid === user.uid}>
                  <SelectValue placeholder={t('admin.usersPage.setRole')} />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="user">user</SelectItem>
                  <SelectItem value="support">support</SelectItem>
                  <SelectItem value="staff">staff</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
              </SelectContent>
          </Select>
        )
      }
      // Staff and Support see roles as text
      return <Badge variant={userRole === 'user' ? 'outline' : 'secondary'}>{userRole}</Badge>;
    }

    const renderActionsCell = (user: UserProfile) => {
      if (currentUserProfile?.role === 'admin') {
        return (
          <Button variant="ghost" size="icon" disabled>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        );
      }
      if (currentUserProfile?.role === 'staff') {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem disabled>{t('admin.usersPage.resetPassword')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
      // Support has no actions
      return null;
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
                        {currentUserProfile?.role !== 'support' && <TableHead className="text-right">{t('admin.usersPage.actions')}</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {visibleUsers.map(user => (
                        <TableRow key={user.uid}>
                            <TableCell className="font-medium flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={user.photoURL} alt={user.displayName} />
                                    <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                <p>{user.displayName}</p>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                            <TableCell>
                                <Badge variant={user.kycStatus === 'Verified' ? "default" : (user.kycStatus === 'Pending' ? 'secondary' : 'destructive')}>
                                    {user.kycStatus}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {user.createdAt?.toDate ? formatDistanceToNow(user.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                            </TableCell>
                             <TableCell>
                                {renderRoleCell(user)}
                            </TableCell>
                            {currentUserProfile?.role !== 'support' && (
                              <TableCell className="text-right">
                                {renderActionsCell(user)}
                              </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
