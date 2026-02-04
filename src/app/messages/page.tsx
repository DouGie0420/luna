'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { useUser, useFirestore, useCollection } from '@/firebase';
import type { UserProfile, DirectChat, ChatMessage } from '@/lib/types';
import { collection, query, where, orderBy, addDoc, serverTimestamp, doc, writeBatch, increment, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function ChatInterface({ chat }: { chat: DirectChat }) {
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const messagesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'direct_chats', chat.id, 'messages'),
            orderBy('createdAt', 'asc')
        );
    }, [firestore, chat.id]);

    const { data: messages, loading } = useCollection<ChatMessage>(messagesQuery);
    
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!firestore || !user || !chat || !newMessage.trim()) return;

        setIsSending(true);

        const batch = writeBatch(firestore);

        const messagesRef = collection(firestore, 'direct_chats', chat.id, 'messages');
        const newMessageDocRef = doc(messagesRef);
        batch.set(newMessageDocRef, {
            senderId: user.uid,
            text: newMessage.trim(),
            createdAt: serverTimestamp(),
        });

        const chatRef = doc(firestore, 'direct_chats', chat.id);
        const chatUpdatePayload: any = {
            lastMessage: newMessage.trim(),
            lastMessageTimestamp: serverTimestamp(),
        };

        if (!chat.hasReplied) {
            if (user.uid === chat.initiatorId) {
                if (chat.initialMessageCount < 5) {
                    chatUpdatePayload.initialMessageCount = increment(1);
                } else {
                    // This should be blocked by rules, but as a safeguard:
                    setIsSending(false);
                    return; 
                }
            } else {
                chatUpdatePayload.hasReplied = true;
            }
        }
        
        batch.update(chatRef, chatUpdatePayload);

        try {
            await batch.commit();
            setNewMessage('');
        } catch (e: any) {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: messagesRef.path,
                operation: 'create',
            }));
        } finally {
            setIsSending(false);
        }
    };
    
    const otherParticipantId = chat.participants.find(p => p !== user?.uid);
    const otherParticipantProfile = otherParticipantId ? chat.participantProfiles[otherParticipantId] : null;

    const canSend = chat.hasReplied || (user?.uid === chat.initiatorId && chat.initialMessageCount < 5) || (user?.uid !== chat.initiatorId) || chat.isFriendMode;

    return (
        <>
            <CardHeader className="flex flex-row items-center gap-4 border-b">
                {otherParticipantProfile && (
                    <>
                        <Avatar>
                            <AvatarImage src={otherParticipantProfile.photoURL} alt={otherParticipantProfile.displayName} />
                            <AvatarFallback>{otherParticipantProfile.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-lg font-semibold">{otherParticipantProfile.displayName}</h2>
                    </>
                )}
            </CardHeader>
            <CardContent className="flex-grow p-6 flex flex-col">
                <ScrollArea className="flex-grow" viewportRef={scrollAreaRef}>
                    <div className="space-y-4">
                        {messages?.map(msg => (
                            <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                {msg.senderId !== user?.uid && otherParticipantProfile && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={otherParticipantProfile.photoURL} />
                                        <AvatarFallback>{otherParticipantProfile.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 ${msg.senderId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                                    <p>{msg.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
            <div className="p-4 border-t">
                <div className="relative">
                    <Input 
                        placeholder={canSend ? "Type a message..." : "Wait for the user to reply..."}
                        className="pr-12"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isSending && canSend && handleSendMessage()}
                        disabled={isSending || !canSend}
                    />
                    <Button 
                        size="icon" 
                        className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-10"
                        onClick={handleSendMessage}
                        disabled={isSending || !canSend}
                    >
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </>
    );
}

export default function MessagesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const initialChatId = searchParams.get('chatId');

  const [chats, setChats] = useState<DirectChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialChatId);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const CHATS_PAGE_SIZE = 20;

  const fetchChats = useCallback(async (loadMore = false) => {
    if (!firestore || !user) {
        setLoading(false);
        return;
    }
    
    if (!loadMore) setLoading(true);
    else setLoadingMore(true);

    let q;
    const constraints = [
        where('participants', 'array-contains', user.uid),
        orderBy('lastMessageTimestamp', 'desc'),
        limit(CHATS_PAGE_SIZE)
    ];

    if (loadMore && lastVisible) {
        q = query(collection(firestore, 'direct_chats'), ...constraints, startAfter(lastVisible));
    } else {
        q = query(collection(firestore, 'direct_chats'), ...constraints);
    }
    
    try {
        const querySnapshot = await getDocs(q);
        const newChats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DirectChat));

        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
        setHasMore(newChats.length === CHATS_PAGE_SIZE);

        if (loadMore) {
            setChats(prev => [...prev, ...newChats]);
        } else {
            setChats(newChats);
            if (!initialChatId && newChats.length > 0) {
                setSelectedChatId(newChats[0].id);
            }
        }
    } catch (e: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'direct_chats',
            operation: 'list',
        }));
    } finally {
        setLoading(false);
        setLoadingMore(false);
    }
  }, [firestore, user, lastVisible, initialChatId]);

  useEffect(() => {
    if (user && firestore) {
      fetchChats(false);
    }
  }, [user, firestore]);

  const selectedChat = useMemo(() => {
    return chats.find(c => c.id === selectedChatId) || null;
  }, [chats, selectedChatId]);
  
  return (
    <>
      <PageHeaderWithBackAndClose />
      <div className="container mx-auto px-4 py-12">
        <div className="h-[calc(100vh-200px)] grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>Chats</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-grow">
                    <ScrollArea className="h-full">
                        {loading ? (
                          <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : chats.length > 0 ? (
                           <>
                            {chats.map(chat => {
                                const otherParticipantId = chat.participants.find(p => p !== user?.uid);
                                const otherParticipantProfile = otherParticipantId ? chat.participantProfiles[otherParticipantId] : null;

                                return (
                                <div key={chat.id} 
                                    className={`flex items-center gap-4 p-4 cursor-pointer ${selectedChat?.id === chat.id ? 'bg-accent' : 'hover:bg-accent/50'}`}
                                    onClick={() => setSelectedChatId(chat.id)}
                                >
                                    <Avatar className="relative h-12 w-12">
                                        <AvatarImage src={otherParticipantProfile?.photoURL} alt={otherParticipantProfile?.displayName} />
                                        <AvatarFallback>{otherParticipantProfile?.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow overflow-hidden">
                                        <p className="font-semibold truncate">{otherParticipantProfile?.displayName}</p>
                                        <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                                        <p className="text-xs text-muted-foreground/80 mt-1">{chat.lastMessageTimestamp ? formatDistanceToNow(chat.lastMessageTimestamp.toDate(), { addSuffix: true }) : ''}</p>
                                    </div>
                                </div>
                                );
                            })}
                            {hasMore && (
                                <div className="p-2">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => fetchChats(true)}
                                        disabled={loadingMore}
                                    >
                                        {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load More"}
                                    </Button>
                                </div>
                            )}
                           </>
                        ) : (
                          <p className="p-4 text-center text-muted-foreground">No conversations yet.</p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-3 flex flex-col">
                {selectedChat ? (
                  <ChatInterface chat={selectedChat} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : <p className="text-muted-foreground">Select a conversation to start chatting</p>}
                  </div>
                )}
            </Card>
        </div>
      </div>
    </>
  )
}
