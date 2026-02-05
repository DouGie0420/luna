
'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Gem, ShoppingBag, ShoppingCart, Star, Users, UserPlus, ShieldCheck, Globe, Fingerprint, Search, MessageSquare, ChevronUp, ChevronDown, Languages, Info, Translate } from "lucide-react";
import { useUser, useFirestore, useDoc } from '@/firebase';
import type { UserProfile, DirectChat, ChatMessage } from '@/lib/types';
import { collection, query, where, orderBy, addDoc, serverTimestamp, doc, writeBatch, increment, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, onSnapshot } from 'firebase/firestore';
import { formatDistanceToNow, format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { useTranslation } from '@/hooks/use-translation';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
// import { translateText } from '@/ai/flows/translate-text';


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
    const { toast } = useToast();
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [showSearch, setShowSearch] = useState(false);
    
    // const [isTranslating, setIsTranslating] = useState(false);

    // New search state
    const [messageSearchTerm, setMessageSearchTerm] = useState('');
    const debouncedMessageSearchTerm = useDebounce(messageSearchTerm, 300);
    const [matches, setMatches] = useState<{id: string; index: number}[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(true);
    
    const otherParticipantId = chat.participants.find(p => p !== user?.uid);
    const { data: otherParticipantProfileData, loading: otherParticipantLoading } = useDoc<UserProfile>(firestore && otherParticipantId ? doc(firestore, 'users', otherParticipantId) : null);

    const otherParticipantFromChat = otherParticipantId ? chat.participantProfiles[otherParticipantId] : null;
    const displayUser = otherParticipantProfileData || otherParticipantFromChat;
    const profileUrl = displayUser ? `/@${(displayUser as any).loginId || (displayUser as any).uid}` : '#';
    const onSaleCount = otherParticipantProfileData?.onSaleCount ?? 0;
    const displayName = displayUser?.displayName || "User";

    // const needsTranslation = profile && otherParticipantProfileData && profile.preferredLanguage !== otherParticipantProfileData.preferredLanguage;

    const highlightText = (text: string): React.ReactNode => {
      if (!debouncedMessageSearchTerm.trim()) return text;
      try {
        const regex = new RegExp(`(${debouncedMessageSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        if (!regex.test(text)) {
            return text;
        }
        regex.lastIndex = 0;

        return text.split(regex).map((part, index) => {
            if (index % 2 === 1) {
                return <mark key={index} className="bg-yellow-400 text-black rounded-sm px-0.5">{part}</mark>;
            }
            return part;
        });
      } catch (e) {
        console.error("Regex error in highlightText:", e);
        return text;
      }
    };
    
    useEffect(() => {
        if (!debouncedMessageSearchTerm.trim()) {
            setMatches([]);
            setCurrentMatchIndex(-1);
            return;
        }
        const newMatches = messages
            .map((msg, index) => ({...msg, index}))
            .filter(msg => msg.text.toLowerCase().includes(debouncedMessageSearchTerm.toLowerCase()))
            .map(msg => ({ id: msg.id, index: msg.index }));
        
        setMatches(newMatches);
        setCurrentMatchIndex(newMatches.length > 0 ? 0 : -1);
    }, [debouncedMessageSearchTerm, messages]);

    useEffect(() => {
        if (currentMatchIndex !== -1 && matches[currentMatchIndex]) {
            const matchId = matches[currentMatchIndex].id;
            const element = document.getElementById(`msg-${matchId}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentMatchIndex, matches]);

    const handlePrevMatch = () => {
        setCurrentMatchIndex(prev => (prev > 0 ? prev - 1 : prev));
    };

    const handleNextMatch = () => {
        setCurrentMatchIndex(prev => (prev < matches.length - 1 ? prev + 1 : prev));
    };

    const messagesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'direct_chats', chat.id, 'messages'),
            orderBy('createdAt', 'asc')
        );
    }, [firestore, chat.id]);

    useEffect(() => {
        if (!messagesQuery) return;
        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
            setMessages(msgs);
            setLoadingMessages(false);
        }, (error) => {
            console.error("Failed to listen to messages:", error);
            setLoadingMessages(false);
        });
        return () => unsubscribe();
    }, [messagesQuery]);
    
    useEffect(() => {
        if (scrollAreaRef.current && !messageSearchTerm) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, messageSearchTerm]);
    
    //  const handleTranslate = async () => {
    //     if (!newMessage.trim() || !otherParticipantProfileData?.preferredLanguage) return;
    //     setIsTranslating(true);
    //     try {
    //         const result = await translateText({ text: newMessage, targetLanguage: otherParticipantProfileData.preferredLanguage });
    //         setNewMessage(result.translatedText);
    //     } catch (error) {
    //         console.error("Translation failed:", error);
    //         toast({ variant: 'destructive', title: 'Translation failed' });
    //     } finally {
    //         setIsTranslating(false);
    //     }
    // };

    const handleSendMessage = async () => {
        if (!firestore || !user || !chat || !newMessage.trim()) return;

        setIsSending(true);

        const batch = writeBatch(firestore);
        const messagesRef = collection(firestore, 'direct_chats', chat.id, 'messages');
        const newMessageDocRef = doc(messagesRef);
        
        const messagePayload: Omit<ChatMessage, 'id'> = {
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
        } catch (e: any) {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `A message in chat ${chat.id}`,
                operation: 'create',
            }));
        } finally {
            setNewMessage('');
            setIsSending(false);
        }
    };
    
    const canSend = chat.isFriendMode || chat.hasReplied || (user?.uid === chat.initiatorId && (chat.initialMessageCount || 0) < 5) || (user?.uid !== chat.initiatorId && !chat.hasReplied);

    return (
        <>
            <CardHeader className="flex flex-row items-center justify-between gap-4 border-b">
                 {displayUser && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="flex items-center gap-4 cursor-pointer">
                                <UserAvatar profile={displayUser as UserProfile} className="h-12 w-12" />
                                <h2 className="text-lg font-semibold">{displayName}</h2>
                            </div>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                           <DialogHeader>
                                <DialogTitle className="flex items-center gap-3">
                                    <UserAvatar profile={displayUser as UserProfile} className="h-12 w-12" />
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
                 <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setShowSearch(!showSearch)}>
                        <Search className="h-5 w-5" />
                    </Button>
                </div>
            </CardHeader>
             {showSearch && (
                <div className="flex items-center gap-2 border-b p-2 shrink-0">
                    <Input
                        placeholder="Search in chat..."
                        value={messageSearchTerm}
                        onChange={(e) => setMessageSearchTerm(e.target.value)}
                        className="h-8"
                    />
                    {debouncedMessageSearchTerm && matches.length > 0 ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                            <span>{currentMatchIndex + 1} / {matches.length}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMatch} disabled={currentMatchIndex <= 0}>
                                <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMatch} disabled={currentMatchIndex >= matches.length - 1}>
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : debouncedMessageSearchTerm && !loadingMessages ? (
                         <span className="text-sm text-muted-foreground whitespace-nowrap">No results</span>
                    ) : null}
                </div>
            )}
            <CardContent className="flex-grow p-0 flex flex-col min-h-0">
                <ScrollArea className="h-full" viewportRef={scrollAreaRef}>
                  <TooltipProvider delayDuration={100}>
                    <div className="p-6 space-y-4">
                        {loadingMessages ? <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div> : messages?.map(msg => (
                            <div key={msg.id} id={`msg-${msg.id}`} className={`flex items-end gap-2 ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                {msg.senderId !== user?.uid && otherParticipantFromChat && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={otherParticipantFromChat.photoURL} />
                                        <AvatarFallback>{otherParticipantFromChat.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={`flex flex-col gap-1 ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className={cn(
                                                `max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 transition-all relative`,
                                                msg.senderId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-secondary',
                                                matches.some(m => m.id === msg.id) && 'ring-1 ring-yellow-400/50',
                                                matches[currentMatchIndex]?.id === msg.id && 'ring-2 ring-yellow-500',
                                                msg.isTranslated && "border-dashed border-primary"
                                            )}>
                                                <p className="whitespace-pre-wrap break-words">{highlightText(msg.text)}</p>
                                            </div>
                                        </TooltipTrigger>
                                        {msg.isTranslated && msg.originalText && (
                                            <TooltipContent>
                                                <p><strong>Original:</strong> {msg.originalText}</p>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                    {msg.createdAt?.toDate && (
                                        <span className="text-xs text-muted-foreground px-1">
                                            {format(msg.createdAt.toDate(), 'HH:mm')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                  </TooltipProvider>
                </ScrollArea>
            </CardContent>
            <div className="p-4 border-t">
                <div className="relative">
                    <Input 
                        placeholder={canSend ? "输入消息..." : "等待对方回复..."}
                        className={cn("pr-24")}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isSending && canSend) {
                                handleSendMessage();
                            }
                        }}
                        disabled={isSending || !canSend}
                    />
                    <div className="absolute top-1/2 right-1 -translate-y-1/2 flex items-center">
                        {/* {needsTranslation && (
                            <Button 
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={handleTranslate}
                                disabled={isTranslating || !newMessage.trim()}
                                title="Translate"
                            >
                                {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Translate className="h-4 w-4" />}
                            </Button>
                        )} */}
                        <Button 
                            size="icon" 
                            className="h-8 w-10"
                            onClick={handleSendMessage}
                            disabled={isSending || !canSend || !newMessage.trim()}
                        >
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default function MessagesPage() {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [chats, setChats] = useState<DirectChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  
  useEffect(() => {
    if (!firestore || !user) {
        setLoading(false);
        return;
    }

    const q = query(
        collection(firestore, 'direct_chats'), 
        where('participants', 'array-contains', user.uid),
        orderBy('lastMessageTimestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DirectChat));
        setChats(fetchedChats);

        if (loading) {
            const initialId = searchParams.get('chatId');
            if (initialId && fetchedChats.some(c => c.id === initialId)) {
                setSelectedChatId(initialId);
            } else if (!selectedChatId && fetchedChats.length > 0) {
                 setSelectedChatId(fetchedChats[0].id);
            }
            setLoading(false);
        }

    }, (err) => {
        console.error(err);
        setLoading(false);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'direct_chats',
            operation: 'list',
        }));
    });

    return () => unsubscribe();
}, [firestore, user, searchParams, loading, selectedChatId]);
  
  useEffect(() => {
        if (!debouncedSearchTerm.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        if (!firestore || !user) return;
        
        setIsSearching(true);
        const usersRef = collection(firestore, 'users');
        const q = query(
            usersRef,
            where('displayName', '>=', debouncedSearchTerm),
            where('displayName', '<=', debouncedSearchTerm + '\uf8ff'),
            limit(10)
        );

        getDocs(q).then(snapshot => {
            const results = snapshot.docs
                .map(doc => doc.data() as UserProfile)
                .filter(p => p.uid !== user.uid);
            setSearchResults(results);
        }).catch(err => {
            console.error("User search failed:", err);
            toast({ title: 'Search failed', variant: 'destructive' });
        }).finally(() => {
            setIsSearching(false);
        });

    }, [debouncedSearchTerm, firestore, toast, user]);

  const filteredChats = useMemo(() => {
    if (!searchTerm.trim()) return chats;
    const searchTermLower = searchTerm.toLowerCase();
    return chats.filter(chat => {
        const otherParticipantId = chat.participants.find(p => p !== user?.uid);
        if (!otherParticipantId) return false;
        const otherProfile = chat.participantProfiles[otherParticipantId];
        const nameMatch = otherProfile?.displayName.toLowerCase().includes(searchTermLower);
        const messageMatch = chat.lastMessage?.toLowerCase().includes(searchTermLower);
        return nameMatch || messageMatch;
    });
  }, [chats, searchTerm, user]);
  
  const handleSelectUser = async (targetUser: UserProfile) => {
        if (!user || !profile) return;
        if (!firestore) return;

        const existingChat = chats.find(c => c.participants.includes(targetUser.uid));
        if (existingChat) {
            setSelectedChatId(existingChat.id);
            setSearchTerm('');
            setSearchResults([]);
            return;
        }

        try {
            const newChatRef = await addDoc(collection(firestore, 'direct_chats'), {
                participants: [user.uid, targetUser.uid],
                participantProfiles: {
                    [user.uid]: { displayName: profile.displayName, photoURL: profile.photoURL },
                    [targetUser.uid]: { displayName: targetUser.displayName, photoURL: targetUser.photoURL }
                },
                lastMessage: `You started a conversation.`,
                lastMessageTimestamp: serverTimestamp(),
                isFriendMode: false,
                hasReplied: false,
                initiatorId: user.uid,
                initialMessageCount: 0,
                unreadCount: { [user.uid]: 0, [targetUser.uid]: 0 }
            });
            setSearchTerm('');
            setSearchResults([]);
            setSelectedChatId(newChatRef.id);
        } catch (error) {
            console.error("Failed to create chat", error);
            toast({ title: 'Could not start chat.', variant: 'destructive' });
        }
    };

  const selectedChat = useMemo(() => {
    return chats.find(c => c.id === selectedChatId) || null;
  }, [chats, selectedChatId]);
  
   const highlight = (text: string, term: string) => {
      if (!term.trim() || !text) return text;
      try {
          const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          if (!regex.test(text)) {
            return text;
          }
          regex.lastIndex = 0;
          return text.split(regex).map((part, index) => 
              index % 2 === 1 ? <mark key={index} className="bg-primary/30 text-foreground rounded-sm px-0.5">{part}</mark> : part
          );
      } catch (e) {
          console.error("Regex error in highlight:", e);
          return text;
      }
  };


  return (
    <div className="flex flex-col h-full">
      <PageHeaderWithBackAndClose />
      <div className="container mx-auto px-4 py-12 flex-grow min-h-0">
        <div className="h-full grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>私信</CardTitle>
                     <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="搜索用户或最近消息..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-grow min-h-0">
                    <ScrollArea className="h-full">
                        {loading ? (
                          <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : (
                           <>
                            {searchTerm && (
                                <>
                                    <p className="px-4 pt-2 text-xs font-semibold text-muted-foreground">发起新聊天</p>
                                    {isSearching ? (
                                        <div className="p-4 text-center"><Loader2 className="h-4 w-4 animate-spin inline-block"/></div>
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map(p => (
                                             <div key={p.uid} 
                                                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-accent/50"
                                                onClick={() => handleSelectUser(p)}
                                            >
                                                <UserAvatar profile={p} className="h-12 w-12" />
                                                <div className="flex-grow overflow-hidden">
                                                    <p className="font-semibold truncate">{p.displayName}</p>
                                                    <p className="text-sm text-muted-foreground truncate">@{p.loginId}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="p-4 text-center text-sm text-muted-foreground">没有找到用户</p>
                                    )}
                                    <Separator className="my-2" />
                                </>
                            )}
                            {filteredChats.length > 0 ? (
                                <>
                                    {filteredChats.map(chat => {
                                        const otherParticipantId = chat.participants.find(p => p !== user?.uid);
                                        const otherParticipantProfile = otherParticipantId ? chat.participantProfiles[otherParticipantId] : null;

                                        return (
                                        <div key={chat.id} 
                                            className={`flex items-center gap-4 p-4 cursor-pointer ${selectedChat?.id === chat.id ? 'bg-accent' : 'hover:bg-accent/50'}`}
                                            onClick={() => setSelectedChatId(chat.id)}
                                        >
                                            <UserAvatar profile={otherParticipantProfile as UserProfile} className="h-12 w-12" />
                                            <div className="flex-grow overflow-hidden">
                                                <p className="font-semibold truncate">{highlight(otherParticipantProfile?.displayName || '', searchTerm)}</p>
                                                <p className="text-sm text-muted-foreground truncate">{highlight(chat.lastMessage, searchTerm)}</p>
                                                <p className="text-xs text-muted-foreground/80 mt-1">{chat.lastMessageTimestamp ? formatDistanceToNow(chat.lastMessageTimestamp.toDate(), { addSuffix: true }) : ''}</p>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </>
                            ) : (
                                !searchTerm && <p className="p-4 text-center text-muted-foreground">还没有对话。</p>
                            )}
                           </>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-3 flex flex-col">
                {selectedChat ? (
                  <ChatInterface chat={selectedChat} />
                ) : (
                   <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <MessageSquare className="h-16 w-16 text-muted-foreground/20" />
                        <h2 className="mt-6 text-xl font-semibold">选择一个对话</h2>
                        <p className="mt-2 text-sm text-muted-foreground max-w-xs">从左侧选择一个现有的对话，或者使用搜索栏寻找用户并开始新的对话。</p>
                    </div>
                )}
            </Card>
        </div>
      </div>
    </div>
  )
}
