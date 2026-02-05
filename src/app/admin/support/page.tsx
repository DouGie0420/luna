
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  getDocs
} from "firebase/firestore";
import type { SupportTicket, ChatMessage, UserProfile } from "@/lib/types";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from "date-fns";
import { enUS, zhCN, th } from 'date-fns/locale';

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Loader2, Send, Ticket, Clock, UserCircle, Inbox, ChevronsUpDown, CheckCircle, CircleDot, PauseCircle, Ban, LifeBuoy, MoreVertical } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const locales = { en: enUS, zh: zhCN, th: th };
type TicketStatus = SupportTicket['status'];

const getStatusConfig = (status: TicketStatus): { icon: React.FC<any>, color: string, variant: "destructive" | "secondary" | "default" } => {
    switch (status) {
        case 'Open': return { icon: CircleDot, color: 'text-red-500', variant: 'destructive' };
        case 'Pending': return { icon: PauseCircle, color: 'text-yellow-500', variant: 'secondary' };
        case 'Resolved': return { icon: CheckCircle, color: 'text-green-500', variant: 'default' };
        case 'Closed': return { icon: Ban, color: 'text-gray-500', variant: 'secondary' };
        default: return { icon: CircleDot, color: 'text-gray-500', variant: 'secondary' };
    }
};

const getTicketStatusTranslationKey = (status: TicketStatus) => {
    return `admin.supportPage.status.${status.toLowerCase()}`;
}


function TicketStats({ tickets }: { tickets: SupportTicket[] }) {
    const { t } = useTranslation();
    const stats = useMemo(() => {
        return tickets.reduce((acc, ticket) => {
            acc[ticket.status] = (acc[ticket.status] || 0) + 1;
            return acc;
        }, {} as Record<TicketStatus, number>);
    }, [tickets]);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(['Open', 'Pending', 'Resolved', 'Closed'] as TicketStatus[]).map(status => {
                const config = getStatusConfig(status);
                return (
                    <Card key={status}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t(getTicketStatusTranslationKey(status))}</CardTitle>
                            <config.icon className={cn('h-4 w-4 text-muted-foreground', config.color)} />
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
    const { t, language } = useTranslation();
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [reply, setReply] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [staffMembers, setStaffMembers] = useState<UserProfile[]>([]);
    
    const ticketRef = useMemo(() => firestore ? doc(firestore, 'support_tickets', ticketId) : null, [firestore, ticketId]);
    const { data: ticket, loading: ticketLoading } = useDoc<SupportTicket>(ticketRef);
    
    const userProfileRef = useMemo(() => firestore && ticket?.userId ? doc(firestore, 'users', ticket.userId) : null, [firestore, ticket]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    useEffect(() => {
        if (!firestore) return;
        const staffQuery = query(collection(firestore, 'users'), where('role', 'in', ['staff', 'support', 'admin', 'ghost']));
        getDocs(staffQuery).then(snapshot => {
            setStaffMembers(snapshot.docs.map(doc => ({...doc.data() as UserProfile, uid: doc.id})));
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
            toast({ title: t('admin.supportPage.statusUpdated'), description: t('admin.supportPage.statusUpdatedDesc', { ticketId: ticketId, status: t(getTicketStatusTranslationKey(status)) }) });
        } catch (e) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ticketRef.path, operation: 'update', requestResourceData: { status } }));
        }
    };
    
    const handleAssign = async (staffId: string) => {
        if (!firestore || !ticketRef) return;
        try {
            await updateDoc(ticketRef, { assignedTo: staffId, updatedAt: serverTimestamp() });
            toast({ title: t('admin.supportPage.ticketAssigned') });
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
        return <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground"><Inbox className="h-12 w-12 opacity-50" /><p className="mt-4">{t('admin.supportPage.selectTicketPrompt')}</p></div>;
    }

    const assignedToStaff = staffMembers.find(s => s.uid === ticket.assignedTo);
    const statusConfig = getStatusConfig(ticket.status);

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="border-b">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                         <Badge variant={statusConfig.variant} className="gap-1.5 pl-2">
                            <statusConfig.icon className={cn('h-3 w-3', statusConfig.color)} />
                            {t(getTicketStatusTranslationKey(ticket.status))}
                         </Badge>
                         <p className="text-sm text-muted-foreground">#{ticket.id.slice(0, 6)}</p>
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>{t('admin.supportPage.assignTo')}</DropdownMenuLabel>
                            {staffMembers.map(staff => (
                                <DropdownMenuItem key={staff.uid} onSelect={() => handleAssign(staff.uid)} disabled={staff.uid === ticket.assignedTo}>
                                    {staff.displayName}
                                    {staff.uid === ticket.assignedTo && <CheckCircle className="ml-auto h-4 w-4 text-primary" />}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>{t('admin.supportPage.setStatus')}</DropdownMenuLabel>
                            {(['Open', 'Pending', 'Resolved', 'Closed'] as TicketStatus[]).map(s => (
                                <DropdownMenuItem key={s} onSelect={() => handleStatusChange(s)} disabled={s === ticket.status}>
                                    {t(getTicketStatusTranslationKey(s))}
                                    {s === ticket.status && <CheckCircle className="ml-auto h-4 w-4 text-primary" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <CardTitle className="mt-2 text-xl">{ticket.subject}</CardTitle>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={userProfile?.photoURL} />
                            <AvatarFallback>{userProfile?.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{userProfile?.displayName || ticket.userName}</span>
                    </div>
                    <span>{t('admin.supportPage.updated')} {formatDistanceToNow((ticket.updatedAt || ticket.createdAt).toDate(), { addSuffix: true, locale: locales[language] })}</span>
                </div>
                {assignedToStaff && (
                    <div className="mt-2 text-xs text-muted-foreground">{t('admin.supportPage.assignTo')}: <span className="font-semibold text-foreground">{assignedToStaff.displayName}</span></div>
                )}
            </CardHeader>
            <CardContent className="flex-grow p-0">
                <ScrollArea className="h-[400px]" viewportRef={scrollAreaRef}>
                    <div className="p-6 space-y-6">
                        <div className="flex items-start gap-3">
                            <Avatar><AvatarImage src={userProfile?.photoURL} /><AvatarFallback><UserCircle /></AvatarFallback></Avatar>
                            <div className="p-3 bg-secondary rounded-lg w-full">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold">{userProfile?.displayName}</p>
                                    <p className="text-xs text-muted-foreground">{format((ticket.createdAt).toDate(), 'Pp', { locale: locales[language] })}</p>
                                </div>
                                <p className="text-sm mt-1 whitespace-pre-wrap">{ticket.description}</p>
                            </div>
                        </div>

                        {messages.map(msg => {
                            const senderProfile = staffMembers.find(s => s.uid === msg.senderId) || userProfile;
                            const isStaff = staffMembers.some(s => s.uid === msg.senderId);
                            return (
                                <div key={msg.id} className={cn("flex items-start gap-3", isStaff && 'justify-end')}>
                                    {isStaff && (
                                        <div className="p-3 bg-primary text-primary-foreground rounded-lg w-full max-w-md">
                                             <div className="flex justify-between items-center">
                                                <p className="font-semibold">{senderProfile?.displayName}</p>
                                                <p className="text-xs opacity-70">{msg.createdAt && format(msg.createdAt.toDate(), 'Pp', { locale: locales[language] })}</p>
                                            </div>
                                            <p className="text-sm mt-1 whitespace-pre-wrap">{msg.text}</p>
                                        </div>
                                    )}
                                    <Avatar>
                                        <AvatarImage src={senderProfile?.photoURL} />
                                        <AvatarFallback><UserCircle /></AvatarFallback>
                                    </Avatar>
                                    {!isStaff && (
                                        <div className="p-3 bg-secondary rounded-lg w-full max-w-md">
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold">{senderProfile?.displayName}</p>
                                                <p className="text-xs text-muted-foreground">{msg.createdAt && format(msg.createdAt.toDate(), 'Pp', { locale: locales[language] })}</p>
                                            </div>
                                            <p className="text-sm mt-1 whitespace-pre-wrap">{msg.text}</p>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="border-t p-4">
                <div className="relative w-full">
                     <Textarea 
                        placeholder={t('admin.supportPage.replyPlaceholder')}
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
                        {isReplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        {t('admin.supportPage.sendReply')}
                     </Button>
                </div>
            </CardFooter>
        </Card>
    );
}

export default function AdminSupportPage() {
    const { profile: adminProfile } = useUser();
    const firestore = useFirestore();
    const { t, language } = useTranslation();

    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<TicketStatus | 'All'>('All');

    useEffect(() => {
        if (!firestore) { setLoading(false); return; }
        
        const baseQuery = collection(firestore, 'support_tickets');
        const q = activeFilter === 'All'
            ? query(baseQuery, orderBy('updatedAt', 'desc'))
            : query(baseQuery, where('status', '==', activeFilter), orderBy('updatedAt', 'desc'));

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
        <div className="h-full">
            <div className="flex flex-col h-full space-y-6">
                <div className="flex items-center gap-3 shrink-0">
                    <LifeBuoy className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">{t('admin.supportPage.title')}</h1>
                </div>

                <TicketStats tickets={tickets} />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-0">
                    <Card className="lg:col-span-1 flex flex-col">
                        <CardHeader>
                        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
                                <TabsList className="grid w-full grid-cols-5">
                                    <TabsTrigger value="All">{t('admin.supportPage.all')}</TabsTrigger>
                                    {(['Open', 'Pending', 'Resolved', 'Closed'] as TicketStatus[]).map(status => (
                                        <TabsTrigger key={status} value={status}>{t(getTicketStatusTranslationKey(status))}</TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </CardHeader>
                        <CardContent className="flex-grow p-0">
                            <ScrollArea className="h-[calc(100vh-25rem)]">
                                {loading ? (
                                    <div className="p-4 space-y-2">
                                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                                    </div>
                                ) : tickets.length > 0 ? (
                                    tickets.map(ticket => {
                                        const { icon: Icon, color } = getStatusConfig(ticket.status);
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
                                                    {t('admin.supportPage.updated')} {formatDistanceToNow((ticket.updatedAt || ticket.createdAt).toDate(), { addSuffix: true, locale: locales[language] })}
                                                </p>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                                        <Inbox className="h-10 w-10 opacity-50" />
                                        <p className="mt-4">{t('admin.supportPage.noTicketsInCategory')}</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    <div className="lg:col-span-2">
                        {selectedTicketId ? (
                            <TicketDetail ticketId={selectedTicketId} adminProfile={adminProfile} />
                        ) : (
                            <div className="flex h-full rounded-lg border-2 border-dashed items-center justify-center">
                                <div className="text-center text-muted-foreground">
                                    <Inbox className="h-12 w-12 mx-auto opacity-50" />
                                    <p className="mt-4">{t('admin.supportPage.selectTicketPrompt')}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
