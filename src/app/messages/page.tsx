'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Gem, ShoppingBag, ShoppingCart, Star, Users, UserPlus, ShieldCheck, Globe, Fingerprint, ThumbsUp, Meh, ThumbsDown } from "lucide-react";
import { useUser, useFirestore, useDoc } from '@/firebase';
import type { UserProfile, DirectChat, ChatMessage } from '@/lib/types';
import { collection, query, where, orderBy, addDoc, serverTimestamp, doc, writeBatch, increment, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, onSnapshot } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { useTranslation } from '@/hooks/use-translation';
import { UserAvatar } from '@/components/ui/user-avatar';


const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1.75l-6.172 9.5L12 17.5l6.172-6.25L12 1.75z"/>
        <path d="M5.828 12.5L12 22.25l6.172-9.75L12 17.5 5.828 12.5z"/>
    </svg>
);


function ChatInterface({ chat }: { chat: DirectChat }) {
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { t } = useTranslation();
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

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);

    const otherParticipantId = chat.participants.find(p => p !== user?.uid);
    const { data: otherParticipantProfileData } = useDoc<UserProfile>(firestore && otherParticipantId ? doc(firestore, 'users', otherParticipantId) : null);

    const otherParticipantFromChat = otherParticipantId ? chat.participantProfiles[otherParticipantId] : null;
    const displayUser = otherParticipantProfileData || otherParticipantFromChat;
    const profileUrl = displayUser ? `/@${displayUser.loginId || displayUser.uid}` : '#';
    const onSaleCount = otherParticipantProfileData?.onSaleCount ?? 0;
    const displayName = displayUser?.displayName || "User";


    useEffect(() => {
        if (!messagesQuery) return;
        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
            setMessages(msgs);
            setLoading(false);
        }, (error) => {
            console.error("Failed to listen to messages:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [messagesQuery]);
    
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!firestore || !user || !chat || !newMessage.trim()) return;

        setIsSending(true);

        const batch = writeBatch(firestore);
        const messagesRef = collection(firestore, 'direct_chats', chat.id, 'messages');
        const newMessageDocRef = doc(messagesRef);
        
        const messagePayload = {
            senderId: user.uid,
            text: newMessage.trim(),
            createdAt: serverTimestamp(),
        };

        batch.set(newMessageDocRef, messagePayload);

        const chatRef = doc(firestore, 'direct_chats', chat.id);
        const chatUpdatePayload: any = {
            lastMessage: newMessage.trim(),
            lastMessageTimestamp: serverTimestamp(),
        };

        const otherParticipantId = chat.participants.find(p => p !== user?.uid);
        if(otherParticipantId) {
             chatUpdatePayload[`unreadCount.${otherParticipantId}`] = increment(1);
        }
        
        if (!chat.isFriendMode && !chat.hasReplied) {
            if (user.uid === chat.initiatorId) {
                if ((chat.initialMessageCount || 0) < 5) {
                    chatUpdatePayload.initialMessageCount = increment(1);
                } else {
                    console.warn("Message limit reached.");
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
                path: `A message in chat ${chat.id}`,
                operation: 'create',
            }));
        } finally {
            setIsSending(false);
        }
    };
    
    const canSend = chat.isFriendMode || chat.hasReplied || (user?.uid === chat.initiatorId && (chat.initialMessageCount || 0) < 5) || (user?.uid !== chat.initiatorId && !chat.hasReplied);

    return (
        <>
            <CardHeader className="flex flex-row items-center gap-4 border-b">
                 {displayUser && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="flex items-center gap-4 cursor-pointer">
                                <UserAvatar profile={displayUser} className="h-12 w-12" />
                                <h2 className="text-lg font-semibold">{displayName}</h2>
                            </div>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                           <DialogHeader>
                                <DialogTitle className="flex items-center gap-3">
                                    <UserAvatar profile={displayUser} className="h-12 w-12" />
                                    <div>
                                        <p className="text-xl font-bold">{displayName}</p>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <Star className="h-4 w-4 fill-primary text-primary" />
                                            <span>{(displayUser.rating || 0).toFixed(1)} ({displayUser.reviewsCount || 0} {t('sellerProfile.reviews')})</span>
                                        </div>
                                    </div>
                                </DialogTitle>
                            </DialogHeader>
                             <div className="grid gap-4 py-4">
                                <div className="flex items-center gap-4 p-4 bg-accent/50 rounded-lg animate-glow">
                                    <Gem className="h-10 w-10 text-primary" />
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">{t('accountPage.creditLevel')}</p>
                                        <p className="text-2xl font-bold">{displayUser.creditLevel || 'Newcomer'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">{t('accountPage.creditScore')}</p>
                                        <p className="text-2xl font-bold">{displayUser.creditScore || 0}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Link href={`${profileUrl}/listings`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                                        <ShoppingBag className="h-6 w-6 text-primary" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('sellerProfile.onSale')}</p>
                                            <p className="font-bold hover:underline">{onSaleCount}</p>
                                        </div>
                                    </Link>
                                     <Link href={`${profileUrl}/sold`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                                        <ShoppingCart className="h-6 w-6 text-primary" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('sellerProfile.sold')}</p>
                                            <p className="font-bold hover:underline">{displayUser.salesCount ?? 0}</p>
                                        </div>
                                    </Link>
                                    <Link href={`${profileUrl}/followers`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                                        <Users className="h-6 w-6 text-primary" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('userProfile.followers')}</p>
                                            <p className="font-bold hover:underline">{displayUser.followersCount || 0}</p>
                                        </div>
                                    </Link>
                                    <Link href={`${profileUrl}/following`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                                        <UserPlus className="h-6 w-6 text-primary" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t('userProfile.following')}</p>
                                            <p className="font-bold hover:underline">{displayUser.followingCount || 0}</p>
                                        </div>
                                    </Link>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2">{t('userProfile.verifications')}</h4>
                                    <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
                                        {displayUser.isPro && (<div className="flex items-center gap-1.5 text-green-500"><ShieldCheck className="h-4 w-4" /><span>{t('userProfile.pro')}</span></div>)}
                                        {displayUser.isWeb3Verified && (<div className="flex items-center gap-1.5 text-blue-400"><Globe className="h-4 w-4" /><span>WEB3</span></div>)}
                                        {displayUser.isNftVerified && (<div className="flex items-center gap-1.5 text-blue-400"><EthereumIcon className="h-4 w-4 stroke-blue-400" /><span>NFT</span></div>)}
                                        {displayUser.kycStatus === 'Verified' && (<div className="flex items-center gap-1.5 text-yellow-400"><Fingerprint className="h-4 w-4" /><span>{t('userProfile.kyc')}</span></div>)}
                                        {!displayUser.isPro && !displayUser.isWeb3Verified && !displayUser.isNftVerified && displayUser.kycStatus !== 'Verified' && (<p className="text-xs text-muted-foreground">{t('userProfile.noVerifications')}</p>)}
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent className="flex-grow p-6 flex flex-col">
                <ScrollArea className="flex-grow" viewportRef={scrollAreaRef}>
                    <div className="space-y-4">
                        {loading ? <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div> : messages?.map(msg => (
                            <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                {msg.senderId !== user?.uid && otherParticipantFromChat && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={otherParticipantFromChat.photoURL} />
                                        <AvatarFallback>{otherParticipantFromChat.displayName?.charAt(0)}</AvatarFallback>
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
                        placeholder={canSend ? "输入消息..." : "等待对方回复..."}
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
                        disabled={isSending || !canSend || !newMessage.trim()}
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

    const constraints = [
        where('participants', 'array-contains', user.uid),
        orderBy('lastMessageTimestamp', 'desc'),
        limit(CHATS_PAGE_SIZE)
    ];

    if (loadMore && lastVisible) {
        constraints.push(startAfter(lastVisible));
    }
    
    const q = query(collection(firestore, 'direct_chats'), ...constraints);
    
    try {
        const querySnapshot = await getDocs(q);
        const newChats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DirectChat));

        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
        setHasMore(newChats.length === CHATS_PAGE_SIZE);

        setChats(prev => loadMore ? [...prev, ...newChats] : newChats);
        
        if (!loadMore && !initialChatId && newChats.length > 0) {
            setSelectedChatId(newChats[0].id);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
                    <CardTitle>私信</CardTitle>
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
                                        {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "加载更多"}
                                    </Button>
                                </div>
                            )}
                           </>
                        ) : (
                          <p className="p-4 text-center text-muted-foreground">还没有对话。</p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-3 flex flex-col">
                {selectedChat ? (
                  <ChatInterface chat={selectedChat} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : <p className="text-muted-foreground">选择一个对话开始聊天</p>}
                  </div>
                )}
            </Card>
        </div>
      </div>
    </>
  )
}
