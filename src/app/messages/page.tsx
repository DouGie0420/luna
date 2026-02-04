'use client';

import { useState, useMemo } from 'react';
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
import { collection, query, where, orderBy } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

function ChatInterface({ chat }: { chat: DirectChat }) {
    const { user } = useUser();
    const firestore = useFirestore();

    const messagesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'direct_chats', chat.id, 'messages'),
            orderBy('createdAt', 'asc')
        );
    }, [firestore, chat.id]);

    const { data: messages, loading } = useCollection<ChatMessage>(messagesQuery);
    
    const otherParticipantId = chat.participants.find(p => p !== user?.uid);
    const otherParticipantProfile = otherParticipantId ? chat.participantProfiles[otherParticipantId] : null;

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
            <CardContent className="flex-grow p-6 flex flex-col-reverse">
                <ScrollArea className="h-[calc(100vh-400px)]">
                    {loading && <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>}
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
                    <Input placeholder="Type a message..." className="pr-12" />
                    <Button size="icon" className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-10">
                        <Send className="h-4 w-4" />
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

  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialChatId);

  const chatsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'direct_chats'), 
        where('participants', 'array-contains', user.uid),
        orderBy('lastMessageTimestamp', 'desc')
    );
  }, [firestore, user]);

  const { data: chats, loading } = useCollection<DirectChat>(chatsQuery);

  const selectedChat = useMemo(() => {
    if (!chats) return null;
    return chats.find(c => c.id === selectedChatId) || chats[0] || null;
  }, [chats, selectedChatId]);
  
  // Update selectedChatId if the initial one is valid or when chats load
  useState(() => {
    if (chats && chats.length > 0) {
      if (!initialChatId || !chats.some(c => c.id === initialChatId)) {
        setSelectedChatId(chats[0].id);
      }
    }
  });

  return (
    <>
      <PageHeaderWithBackAndClose />
      <div className="container mx-auto px-4 py-12">
        <div className="h-[calc(100vh-200px)] grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Contacts List */}
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
                        ) : chats && chats.length > 0 ? (
                            chats.map(chat => {
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
                            })
                        ) : (
                          <p className="p-4 text-center text-muted-foreground">No conversations yet.</p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Chat Window */}
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
