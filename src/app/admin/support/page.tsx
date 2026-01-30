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

const tickets = [
    { id: "TKT001", subject: "Payment Issue", user: "Charlie Brown", status: "Open", lastUpdate: "2 hours ago" },
    { id: "TKT002", subject: "Item not as described", user: "Alex Doe", status: "Resolved", lastUpdate: "1 day ago" },
    { id: "TKT003", subject: "Withdrawal problem", user: "Billie Jean", status: "Pending", lastUpdate: "3 days ago" },
]

export default function AdminSupportPage() {
    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">Support Tickets</h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Ticket ID</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Update</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tickets.map(ticket => (
                        <TableRow key={ticket.id}>
                            <TableCell className="font-medium">{ticket.id}</TableCell>
                            <TableCell>{ticket.subject}</TableCell>
                            <TableCell>{ticket.user}</TableCell>
                            <TableCell>
                               <Badge variant={ticket.status === 'Resolved' ? 'default' : (ticket.status === 'Open' ? 'destructive' : 'secondary')}>{ticket.status}</Badge>
                            </TableCell>
                             <TableCell>{ticket.lastUpdate}</TableCell>
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
