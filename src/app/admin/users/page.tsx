import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { getUsers } from "@/lib/data"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default async function AdminUsersPage() {
    const users = await getUsers();

    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">Manage Users</h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>KYC Status</TableHead>
                        <TableHead>Joined Date</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map(user => (
                        <TableRow key={user.id}>
                            <TableCell className="font-medium flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p>{user.name}</p>
                                    <p className="text-xs text-muted-foreground">user_{user.id}@example.com</p>
                                </div>
                            </TableCell>
                            <TableCell>{user.rating} ({user.reviews} reviews)</TableCell>
                            <TableCell>
                                <Badge variant={user.id === 'user1' ? "default" : "secondary"} className={user.id === 'user1' ? 'bg-green-500' : ''}>
                                    {user.id === 'user1' ? 'Verified' : 'Pending'}
                                </Badge>
                            </TableCell>
                            <TableCell>2023-10-25</TableCell>
                            <TableCell>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
