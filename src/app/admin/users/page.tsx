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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, CheckCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";

type UserRole = NonNullable<UserProfile['role']>;

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
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users && users.length > 0 ? (
                        users.map(user => (
                            <TableRow key={user.uid}>
                                <TableCell className="font-medium flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={user.photoURL} alt={user.displayName} />
                                        <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <p>{user.displayName}</p>
                                </TableCell>
                                <TableCell className="text-muted-foreground flex items-center gap-2">
                                    {user.email}
                                    {user.emailVerified && (
                                        <CheckCircle className="h-5 w-5 text-green-400" title={t('admin.usersPage.emailVerified')} />
                                    )}
                                </TableCell>
                                <TableCell>
                                     <span className="text-muted-foreground">{user.kycStatus}</span>
                                </TableCell>
                                <TableCell>
                                    {user.createdAt?.toDate ? formatDistanceToNow(user.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                                </TableCell>
                                <TableCell>
                                     <Select 
                                        defaultValue={user.role || 'guest'} 
                                        onValueChange={(value: UserRole) => handleRoleChange(user.uid, value)}
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
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                {t('admin.usersPage.noUsers')}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
