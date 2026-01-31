'use client';

import { useCollection, useFirestore } from "@/firebase";
import { collection, query, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { SupportTicket, UserProfile } from "@/lib/types";
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
import { MoreHorizontal, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast";

type TicketStatus = SupportTicket['status'];

export default function AdminSupportPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const ticketsQuery = firestore ? query(collection(firestore, 'supportTickets')) : null;
    const { data: tickets, loading } = useCollection<SupportTicket>(ticketsQuery);

    const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
      if (!firestore) return;
      const ticketRef = doc(firestore, 'supportTickets', ticketId);
      try {
        await updateDoc(ticketRef, { status, updatedAt: serverTimestamp() });
        toast({ title: "Status Updated", description: `Ticket ${ticketId} moved to ${status}.` });
      } catch (error) {
        console.error("Failed to update status:", error);
        toast({ variant: "destructive", title: "Update Failed", description: "Could not update ticket status." });
      }
    };

    if (loading) {
        return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

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
                    {tickets && tickets.map(ticket => (
                        <TableRow key={ticket.id}>
                            <TableCell className="font-medium font-mono text-xs">{ticket.id}</TableCell>
                            <TableCell>{ticket.subject}</TableCell>
                            <TableCell>{ticket.userName} <span className="text-muted-foreground text-xs">({ticket.userEmail})</span></TableCell>
                            <TableCell>
                               <Badge variant={ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'default' : (ticket.status === 'Open' ? 'destructive' : 'secondary')}>{ticket.status}</Badge>
                            </TableCell>
                             <TableCell>
                                {ticket.updatedAt?.toDate ? formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true }) : formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true })}
                             </TableCell>
                            <TableCell>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'Open')}>Set as Open</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'Pending')}>Set as Pending</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'Resolved')}>Set as Resolved</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'Closed')}>Set as Closed</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
