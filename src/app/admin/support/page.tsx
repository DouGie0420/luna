'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { 
  collection, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp,
  addDoc,
  where,
  onSnapshot,
  Timestamp,
  getDocs
} from "firebase/firestore";
import type { SupportTicket, ChatMessage, UserProfile } from "@/lib/types";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import { Loader2, Send, Ticket, Clock, UserCircle, Inbox, ChevronsUpDown, CheckCircle, CircleDot, PauseCircle, Ban, LifeBuoy } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type TicketStatus = SupportTicket['status'];

const statusConfig: Record<TicketStatus, { icon: React.FC<any>, color: string }> = {
    'Open': { icon: CircleDot, color: 'text-red-500' },
    'Pending': { icon: PauseCircle, color: 'text-yellow-500' },
    'Resolved': { icon: CheckCircle, color: 'text-green-500' },
    'Closed': { icon: Ban, color: 'text-gray-500' }
};

const TicketStats = ({ tickets }: { tickets: SupportTicket[] }) => {
    const stats = useMemo(() => {
        return tickets.reduce((acc, ticket) => {
            acc[ticket.status] = (acc[ticket.status] || 0) + 1;
            return acc;
        }, {} as Record<TicketStatus, number>);
    }, [tickets]);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(['Open', 'Pending', 'Resolved', 'Closed'] as TicketStatus[]).map(status => {
                const Icon = statusConfig[status].icon;
                return (
                    <Card key={status}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{status}</CardTitle>
                            <Icon className={`h-4 w-4 text-muted-foreground ${statusConfig[status].color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats[status] || 0}</div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}

function TicketDetail({ ticketId, adminProfile }: { ticketId: string; adminProfile: UserProfile | null }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // State for this detail view
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [reply, setReply] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [staffMembers, setStaffMembers] = useState<UserProfile[]>([]);
    
    // Fetch ticket, its messages, and its author's profile
    const ticketRef = useMemo(() => firestore ? doc(firestore, 'support_tickets', ticketId) : null, [firestore, ticketId]);
    const { data: ticket, loading: ticketLoading } = useDoc<SupportTicket>(ticketRef);
    
    const userProfileRef = useMemo(() => firestore && ticket?.userId ? doc(firestore, 'users', ticket.userId) : null, [firestore, ticket]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    useEffect(() => {
        if (!firestore) return;
        const staffQuery = query(collection(firestore, 'users'), where('role', 'in', ['staff', 'support', 'admin', 'ghost']));
        getDocs(staffQuery).then(snapshot => {
            setStaffMembers(snapshot.docs.map(doc => doc.data() as UserProfile));
        });
    }, [firestore]);

    useEffect(() => {
        if (!firestore) return;
        const messagesQuery = query(collection(firestore, 'support_tickets', ticketId, 'messages'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
            setMessages(msgs);
        }, (err) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `support_tickets/${ticketId}/messages`, operation: 'list' }));
        });

        return () => unsubscribe();
    }, [firestore, ticketId]);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const handleStatusChange = async (status: TicketStatus) => {
        if (!firestore || !ticketRef) return;
        try {
            await updateDoc(ticketRef, { status, updatedAt: serverTimestamp() });
            toast({ title: "Status Updated", description: `Ticket moved to ${status}.` });
        } catch (e) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ticketRef.path, operation: 'update', requestResourceData: { status } }));
        }
    };
    
    const handleAssign = async (staffId: string) => {
        if (!firestore || !ticketRef) return;
        try {
            await updateDoc(ticketRef, { assignedTo: staffId, updatedAt: serverTimestamp() });
            toast({ title: "Ticket Assigned" });
        } catch (e) {
             errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ticketRef.path, operation: 'update', requestResourceData: { assignedTo: staffId } }));
        }
    }

    const handleSendReply = async () => {
        if (!firestore || !adminProfile || !reply.trim()) return;
        setIsReplying(true);
        try {
            const messagesRef = collection(firestore, 'support_tickets', ticketId, 'messages');
            await addDoc(messagesRef, {
                senderId: adminProfile.uid,
                text: reply,
                createdAt: serverTimestamp()
            });
            await updateDoc(ticketRef!, { updatedAt: serverTimestamp(), status: 'Pending' });
            setReply('');
        } catch (e) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `support_tickets/${ticketId}/messages`, operation: 'create' }));
        } finally {
            setIsReplying(false);
        }
    };

    if (ticketLoading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    if (!ticket) {
        return <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground"><Inbox className="h-12 w-12 opacity-50" /><p className="mt-4">Select a ticket to view its details</p></div>;
    }

    const assignedToStaff = staffMembers.find(s => s.uid === ticket.assignedTo);

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="border-b">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2">
                             <Badge variant={ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'default' : (ticket.status === 'Open' ? 'destructive' : 'secondary')}>{ticket.status}</Badge>
                             <p className="text-sm text-muted-foreground">#{ticket.id.slice(0, 6)}</p>
                        </div>
                        <CardTitle className="mt-2">{ticket.subject}</CardTitle>
                    </div>
                     <div className="flex gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">Assign <ChevronsUpDown className="ml-2 h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Assign To Staff</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {staffMembers.map(staff => (
                                    <DropdownMenuItem key={staff.uid} onSelect={() => handleAssign(staff.uid)}>{staff.displayName}</DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">Set Status <ChevronsUpDown className="ml-2 h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {(['Open', 'Pending', 'Resolved', 'Closed'] as TicketStatus[]).map(s => (
                                    <DropdownMenuItem key={s} onSelect={() => handleStatusChange(s)}>{s}</DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={userProfile?.photoURL} />
                            <AvatarFallback>{userProfile?.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{userProfile?.displayName || ticket.userName}</span>
                    </div>
                    <span>{formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true })}</span>
                </div>
                {assignedToStaff && (
                    <div className="mt-2 text-xs text-muted-foreground">Assigned to: <span className="font-semibold text-foreground">{assignedToStaff.displayName}</span></div>
                )}
            </CardHeader>
            <CardContent className="flex-grow p-0">
                <ScrollArea className="h-[400px]" viewportRef={scrollAreaRef}>
                    <div className="p-6 space-y-6">
                        {/* Initial request */}
                        <div className="flex items-start gap-3">
                            <Avatar><AvatarImage src={userProfile?.photoURL} /><AvatarFallback><UserCircle /></AvatarFallback></Avatar>
                            <div className="p-3 bg-secondary rounded-lg">
                                <p className="font-semibold">{userProfile?.displayName}</p>
                                <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">{format(ticket.createdAt.toDate(), 'Pp')}</p>
                            </div>
                        </div>

                        {/* Replies */}
                        {messages.map(msg => {
                            const isUser = msg.senderId === ticket.userId;
                            const senderProfile = isUser ? userProfile : adminProfile;
                            return (
                                <div key={msg.id} className={`flex items-start gap-3 ${!isUser ? 'justify-end' : ''}`}>
                                    {!isUser && <div className="p-3 bg-primary text-primary-foreground rounded-lg"><p className="text-sm whitespace-pre-wrap">{msg.text}</p></div>}
                                    <Avatar>
                                        <AvatarImage src={senderProfile?.photoURL} />
                                        <AvatarFallback><UserCircle /></AvatarFallback>
                                    </Avatar>
                                    {isUser && <div className="p-3 bg-secondary rounded-lg"><p className="text-sm whitespace-pre-wrap">{msg.text}</p></div>}
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="border-t p-4">
                <div className="relative w-full">
                     <Textarea 
                        placeholder="Type your reply..." 
                        className="pr-24"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                     />
                     <Button 
                        className="absolute right-2 bottom-2" 
                        disabled={isReplying || !reply.trim()}
                        onClick={handleSendReply}
                     >
                        {isReplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Reply
                     </Button>
                </div>
            </CardFooter>
        </Card>
    );
}

export default function AdminSupportPage() {
    const { user: adminUser, profile: adminProfile } = useUser();
    const firestore = useFirestore();
    const { t } = useTranslation();

    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<TicketStatus | 'All'>('All');

    useEffect(() => {
        if (!firestore) { setLoading(false); return; }
        
        const baseQuery = collection(firestore, 'support_tickets');
        const q = activeFilter === 'All'
            ? query(baseQuery, orderBy('createdAt', 'desc'))
            : query(baseQuery, where('status', '==', activeFilter), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SupportTicket);
            setTickets(fetchedTickets);
            setLoading(false);
        }, err => {
            console.error(err);
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'support_tickets', operation: 'list' }));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, activeFilter]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <LifeBuoy className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">{t('admin.supportPage.title')}</h1>
            </div>

            <TicketStats tickets={tickets} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-22rem)]">
                {/* Left Column: Ticket List */}
                <Card className="lg:col-span-1 flex flex-col">
                    <CardHeader>
                       <Tabs defaultValue="All" onValueChange={(v) => setActiveFilter(v as any)}>
                            <TabsList className="grid w-full grid-cols-5">
                                <TabsTrigger value="All">All</TabsTrigger>
                                <TabsTrigger value="Open">Open</TabsTrigger>
                                <TabsTrigger value="Pending">Pending</TabsTrigger>
                                <TabsTrigger value="Resolved">Resolved</TabsTrigger>
                                <TabsTrigger value="Closed">Closed</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </CardHeader>
                    <CardContent className="flex-grow p-0">
                        <ScrollArea className="h-full">
                            {loading ? (
                                <div className="p-4 space-y-2">
                                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                                </div>
                            ) : tickets.length > 0 ? (
                                tickets.map(ticket => {
                                    const Icon = statusConfig[ticket.status].icon;
                                    const color = statusConfig[ticket.status].color;
                                    return (
                                        <div key={ticket.id} 
                                            className={cn("p-4 border-b cursor-pointer hover:bg-accent", selectedTicketId === ticket.id && "bg-accent")}
                                            onClick={() => setSelectedTicketId(ticket.id)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <p className="font-semibold truncate pr-4">{ticket.subject}</p>
                                                <Icon className={cn("h-4 w-4 shrink-0", color)} />
                                            </div>
                                            <p className="text-sm text-muted-foreground">{ticket.userName}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Updated {formatDistanceToNow((ticket.updatedAt || ticket.createdAt).toDate(), { addSuffix: true })}
                                            </p>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                                    <Inbox className="h-10 w-10 opacity-50" />
                                    <p className="mt-4">No tickets in this category</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Right Column: Ticket Detail */}
                <div className="lg:col-span-2">
                    {selectedTicketId ? (
                        <TicketDetail ticketId={selectedTicketId} adminProfile={adminProfile} />
                    ) : (
                        <div className="flex h-full rounded-lg border-2 border-dashed items-center justify-center">
                            <div className="text-center text-muted-foreground">
                                <Inbox className="h-12 w-12 mx-auto opacity-50" />
                                <p className="mt-4">Select a ticket to view its details</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
