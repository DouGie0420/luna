'use client';

import { useCollection, useFirestore } from "@/firebase";
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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type UserRole = UserProfile['role'];

export default function AdminUsersPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const usersQuery = firestore ? query(collection(firestore, 'users')) : null;
    const { data: users, loading } = useCollection<UserProfile>(usersQuery);

    const handleRoleChange = async (uid: string, role: UserRole) => {
      if (!firestore || !role) return;
      
      const userRef = doc(firestore, "users", uid);
      try {
        await updateDoc(userRef, { role });
        toast({ title: "Role Updated", description: `User ${uid.slice(0, 6)}... is now a ${role}.` });
      } catch (error) {
        console.error("Failed to update role:", error);
        toast({ variant: "destructive", title: "Update Failed", description: "Could not update user role." });
      }
    };

    if (loading) {
        return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">Manage Users</h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>KYC Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Role</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users && users.map(user => (
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
                                <Select defaultValue={user.role} onValueChange={(value: UserRole) => handleRoleChange(user.uid, value)}>
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue placeholder="Set role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">user</SelectItem>
                                        <SelectItem value="support">support</SelectItem>
                                        <SelectItem value="staff">staff</SelectItem>
                                        <SelectItem value="admin">admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
