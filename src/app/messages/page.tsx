'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Send, Loader2, MessageSquare, Video, MoreVertical, 
    Smile, MapPin, Image as ImageIcon, X
} from "lucide-react";
import { useUser, useFirestore, useDoc } from '@/firebase';
import type { UserProfile, DirectChat, ChatMessage } from '@/lib/types';
import { 
    collection, query, where, orderBy, doc, writeBatch, 
    getDocs, limit, onSnapshot, serverTimestamp, increment
} from 'firebase/firestore';
import { format } from 'date-fns';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// ✅ 蘋果 Emoji 結構化分類庫
const EMOJI_CATEGORIES = [
    {
        id: 'smileys',
        label: '情緒',
        icon: '😀',
        emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','🥲','☺️','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃']
    },
    {
        id: 'gestures',
        label: '手勢',
        icon: '👋',
        emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦿','🦶','👀','👁','👅','👄','💋']
    },
    {
        id: 'symbols',
        label: '符號',
        icon: '✨',
        emojis: ['🩷','❤️','🧡','💛','💚','🩵','💙','💜','🖤','🩶','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','✨','⭐️','🌟','💫','💥','🔥','💧','💦','💨','🌈','☀️','🌙','⚡️','🪐','✅','❌','💯','💢','💬','💭', '💎', '🚀', '🛸']
    }
];

// 圖片壓縮
async function compressImage(file: File): Promise<string> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1000;
                let width = img.width, height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
}

function MessageBubble({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
    return (
        <div className={cn("flex flex-col mb-8 transition-all", isMe ? "items-end" : "items-start")}>
            <div className={cn(
                "max-w-[75%] transition-all relative group z-10",
                msg.type === 'text' ? (isMe ? "bg-gradient-to-br from-[#D33A89]/40 via-[#D33A89]/20 to-transparent text-white border border-[#D33A89]/50 px-6 py-4 rounded-[1.8rem] rounded-tr-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),_0_10px_30px_rgba(211,58,137,0.25)] backdrop-blur-xl" : 
                "bg-gradient-to-br from-white/[0.1] to-white/[0.02] text-white/95 border border-white/20 px-6 py-4 rounded-[1.8rem] rounded-tl-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),_0_5px_15px_rgba(0,0,0,0.2)] backdrop-blur-xl") : ""
            )}>
                {msg.type === 'image' && <img src={msg.text} alt="img" className="rounded-2xl w-full max-w-sm border border-white/20 shadow-2xl" />}
                
                {msg.type === 'location' && (
                    <div className="rounded-[1.8rem] overflow-hidden border border-white/20 bg-[#0a0509] w-72 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] group cursor-pointer hover:border-[#D33A89]/60 hover:shadow-[0_20px_40px_-10px_rgba(211,58,137,0.2)] transition-all">
                        <div className="w-full h-40 relative bg-[#130912]">
                            <iframe 
                                src={`https://maps.google.com/maps?q=${msg.text}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                className="absolute inset-0 w-full h-full contrast-[1.1] opacity-70 mix-blend-screen pointer-events-none"
                                frameBorder="0"
                            />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[#D33A89] rounded-full border-[3px] border-white/80 shadow-[0_0_25px_#D33A89] animate-pulse z-20" />
                        </div>
                        <div className="p-3 bg-gradient-to-r from-white/[0.1] to-transparent flex items-center gap-3 backdrop-blur-md">
                            <div className="p-1.5 bg-[#D33A89]/30 rounded-full shadow-[0_0_10px_#D33A89]">
                                <MapPin className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] text-white font-bold uppercase tracking-widest">Quantum Location</span>
                                <span className="text-[9px] text-white/50 font-mono">{msg.text.split(',').map(n => Number(n).toFixed(3)).join(', ')}</span>
                            </div>
                        </div>
                    </div>
                )}
                
                {msg.type === 'text' && <p className="text-[14px] leading-relaxed tracking-wide font-medium whitespace-pre-wrap">{msg.text}</p>}
            </div>
            <span className="text-[10px] text-white/40 mt-2 font-mono tracking-[0.2em] px-2 uppercase font-semibold">
                {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : 'SENDING...'}
            </span>
        </div>
    );
}

function ChatInterface({ chat, isNewChat = false, targetUser = null }: { chat: DirectChat, isNewChat?: boolean, targetUser?: UserProfile | null }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    // ✅ Emoji 狀態管理
    const [showEmoji, setShowEmoji] = useState(false);
    const [activeEmojiTab, setActiveEmojiTab] = useState(EMOJI_CATEGORIES[0].id);
    
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    
    const otherId = chat.participants.find(p => p !== user?.uid);
    const { data: otherProfile } = useDoc<UserProfile>(firestore && otherId ? doc(firestore, 'users', otherId) : null);
    const displayUser = isNewChat ? targetUser : (otherProfile || chat.participantProfiles[otherId!]);

    useEffect(() => {
        if (!firestore || isNewChat || !chat.id) return;
        const q = query(collection(firestore, 'direct_chats', chat.id, 'messages'), orderBy('createdAt', 'desc'), limit(50));
        return onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)).reverse());
        });
    }, [firestore, chat.id, isNewChat]);

    const handleSend = async (content: string = newMessage, type: 'text' | 'image' | 'location' = 'text') => {
        if (!firestore || !user || (!content.trim() && type === 'text')) return;
        setIsSending(true);
        try {
            const batch = writeBatch(firestore);
            let activeId = chat.id;
            if (isNewChat && activeId === 'new') {
                const newRef = doc(collection(firestore, 'direct_chats'));
                activeId = newRef.id;
                batch.set(newRef, { ...chat, lastMessage: type === 'text' ? content : `[${type}]`, lastMessageTimestamp: serverTimestamp(), initiatorId: user.uid, unreadCount: { [user.uid]: 0, [otherId!]: 1 } });
            }
            batch.set(doc(collection(firestore, 'direct_chats', activeId, 'messages')), { senderId: user.uid, text: content, type, createdAt: serverTimestamp() });
            if (!isNewChat) batch.update(doc(firestore, 'direct_chats', chat.id), { lastMessage: type === 'text' ? content : `[${type}]`, lastMessageTimestamp: serverTimestamp(), [`unreadCount.${otherId}`]: increment(1) });
            await batch.commit();
            setNewMessage('');
            setShowEmoji(false);
        } catch (e) { toast({ title: 'Protocol Error', variant: 'destructive' }); } finally { setIsSending(false); }
    };

    return (
        <div className="flex flex-col h-full w-full bg-transparent relative overflow-hidden">
            <div className="h-[76px] flex items-center justify-between px-10 border-b border-white/[0.08] bg-white/[0.02] shrink-0 backdrop-blur-xl z-20 relative">
                <div className="flex items-center gap-4">
                    <UserAvatar profile={displayUser as UserProfile} className="h-11 w-11 ring-2 ring-[#D33A89]/60 shadow-[0_0_20px_rgba(211,58,137,0.4)]" />
                    <div>
                        <h2 className="text-sm font-black italic tracking-widest text-white uppercase">{displayUser?.displayName || "AETHER"}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-1.5 h-1.5 bg-[#D33A89] rounded-full shadow-[0_0_10px_#D33A89] animate-pulse" />
                            <span className="text-[10px] text-white/60 font-mono tracking-widest uppercase">Secure Link Active</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 opacity-70 hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-xl"><Video className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-xl"><MoreVertical className="h-5 w-5" /></Button>
                </div>
            </div>

            <div className="flex-1 min-h-0 relative z-10">
                <ScrollArea className="h-full px-10 py-8" viewportRef={scrollAreaRef}>
                    <div className="max-w-4xl mx-auto">
                        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} isMe={msg.senderId === user?.uid} />)}
                    </div>
                </ScrollArea>
            </div>

            <div className="shrink-0 px-8 py-6 relative z-30">
                {/* ✅ 帶有分類 Tabs 的高級 Emoji 面板 */}
                {showEmoji && (
                    <div className="absolute bottom-24 left-10 w-[380px] h-[360px] bg-[#140813]/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_30px_80px_rgba(0,0,0,0.8),_inset_0_1px_1px_rgba(255,255,255,0.1)] z-[100] animate-in slide-in-from-bottom-2 fade-in flex flex-col overflow-hidden">
                        {/* 面板 Header */}
                        <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center shrink-0">
                            <span className="text-[11px] text-white/50 font-bold uppercase tracking-[0.2em]">Emojis</span>
                            <button onClick={() => setShowEmoji(false)} className="text-white/30 hover:text-white transition-colors bg-white/5 p-1 rounded-full"><X className="w-4 h-4" /></button>
                        </div>
                        
                        {/* 分類 Tabs */}
                        <div className="flex px-3 py-2 gap-2 border-b border-white/5 shrink-0 bg-white/[0.01]">
                            {EMOJI_CATEGORIES.map(cat => (
                                <button 
                                    key={cat.id} 
                                    onClick={() => setActiveEmojiTab(cat.id)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-bold transition-all",
                                        activeEmojiTab === cat.id 
                                            ? "bg-[#D33A89]/20 text-[#D33A89] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
                                            : "text-white/40 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <span className="text-[14px]">{cat.icon}</span> {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Emoji 網格 */}
                        <ScrollArea className="flex-1 p-4">
                            <div className="grid grid-cols-8 gap-x-1 gap-y-2 pb-4">
                                {EMOJI_CATEGORIES.find(c => c.id === activeEmojiTab)?.emojis.map((e, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => setNewMessage(p => p + e)} 
                                        className="text-[22px] hover:scale-125 hover:bg-white/10 rounded-xl transition-all flex items-center justify-center aspect-square"
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}
                
                <div className="flex items-center gap-3 bg-gradient-to-b from-white/[0.08] to-black/40 p-2 pl-5 rounded-full border border-white/10 focus-within:border-[#D33A89]/60 focus-within:shadow-[0_0_30px_rgba(211,58,137,0.3),_inset_0_2px_5px_rgba(0,0,0,0.5)] transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.5),_0_15px_40px_rgba(0,0,0,0.6)] max-w-4xl mx-auto backdrop-blur-xl">
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all" onClick={() => fileInputRef.current?.click()}>
                            <ImageIcon className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all" onClick={() => {
                            navigator.geolocation.getCurrentPosition(pos => {
                                handleSend(`${pos.coords.latitude},${pos.coords.longitude}`, 'location');
                            });
                        }}>
                            <MapPin className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className={cn("h-10 w-10 rounded-full transition-all", showEmoji ? "text-white bg-[#D33A89] shadow-[0_0_15px_#D33A89]" : "text-white/60 hover:text-white hover:bg-white/10")} onClick={() => setShowEmoji(!showEmoji)}>
                            <Smile className="h-5 w-5" />
                        </Button>
                    </div>

                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={async (e) => {
                        if (e.target.files?.[0]) handleSend(await compressImage(e.target.files[0]), 'image');
                    }} />

                    <Input 
                        placeholder="ENTER PROTOCOL DATA..." 
                        className="flex-1 bg-transparent border-none focus-visible:ring-0 text-[13px] font-mono tracking-widest uppercase h-12 text-white placeholder:text-white/30" 
                        value={newMessage} 
                        onChange={e => setNewMessage(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSend()} 
                    />
                    
                    <Button onClick={() => handleSend()} disabled={isSending || !newMessage.trim()} className="bg-gradient-to-br from-[#D33A89] to-[#b32d72] hover:scale-105 text-white h-12 w-12 rounded-full shadow-[0_0_25px_rgba(211,58,137,0.6),_inset_0_1px_1px_rgba(255,255,255,0.4)] transition-all flex items-center justify-center border border-white/20">
                        {isSending ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5 -ml-1" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function MessagesPage() {
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const searchParams = useSearchParams();
    
    const [chats, setChats] = useState<DirectChat[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [pendingUser, setPendingUser] = useState<UserProfile | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!firestore || !user || !mounted) return;
        const q = query(collection(firestore, 'direct_chats'), where('participants', 'array-contains', user.uid), orderBy('lastMessageTimestamp', 'desc'), limit(50));
        return onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DirectChat));
            setChats(fetched);
            const targetUid = searchParams.get('to');
            if (targetUid) {
                const existing = fetched.find(c => c.participants.includes(targetUid));
                if (existing) { setSelectedChatId(existing.id); setPendingUser(null); }
                else {
                    getDocs(query(collection(firestore, 'users'), where('uid', '==', targetUid), limit(1))).then(uSnap => {
                        if (!uSnap.empty) { setPendingUser(uSnap.docs[0].data() as UserProfile); setSelectedChatId('new-conversation'); }
                    });
                }
            } else if (!selectedChatId && fetched.length > 0) setSelectedChatId(fetched[0].id);
        });
    }, [firestore, user, searchParams, mounted, selectedChatId]);

    if (!mounted) return null;
    const currentChat = chats.find(c => c.id === selectedChatId);

    return (
        <div className="h-screen w-full bg-[#050104] text-white flex flex-col overflow-hidden" suppressHydrationWarning>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1d0d1b] via-[#080207] to-[#050104] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#D33A89]/10 blur-[200px] rounded-full pointer-events-none mix-blend-screen" />

            <div className="shrink-0 h-[64px] z-50 relative border-b border-white/[0.05] bg-white/[0.01] backdrop-blur-md">
                <PageHeaderWithBackAndClose />
            </div>
            
            <div className="flex-1 w-full flex justify-center items-start pt-[10px] pb-8 px-4 md:px-8 z-10 overflow-hidden relative">
                
                <div className="w-full max-w-[1280px] h-full max-h-[850px] flex bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-[60px] rounded-[2.5rem] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.9),_inset_0_1px_1px_rgba(255,255,255,0.2)] overflow-hidden relative z-20 ring-1 ring-white/5">
                    
                    <div className="w-[320px] flex flex-col border-r border-white/[0.08] bg-white/[0.02] shrink-0 backdrop-blur-md relative z-10">
                        <div className="h-[76px] flex items-center px-8 border-b border-white/[0.08] shrink-0 bg-white/[0.01]">
                            <h2 className="text-[12px] font-black italic text-white/60 uppercase tracking-[0.3em] drop-shadow-sm">Active Streams</h2>
                        </div>
                        <ScrollArea className="flex-1">
                            {chats.map(c => {
                                const otherId = c.participants.find(p => p !== user?.uid);
                                const other = c.participantProfiles[otherId!];
                                const isActive = selectedChatId === c.id;
                                return (
                                    <div key={c.id} onClick={() => { setSelectedChatId(c.id); setPendingUser(null); }} className={cn("p-6 cursor-pointer border-b border-white/[0.03] flex items-center gap-4 transition-all relative group", isActive ? "bg-gradient-to-r from-[#D33A89]/20 to-transparent" : "hover:bg-white/[0.04]")}>
                                        {isActive && <div className="absolute left-0 top-6 bottom-6 w-1 bg-[#D33A89] shadow-[0_0_20px_#D33A89] rounded-r-full" />}
                                        <UserAvatar profile={other as any} className={cn("h-12 w-12 transition-all shadow-xl border border-white/10", isActive ? "ring-2 ring-[#D33A89] scale-105" : "opacity-60 grayscale group-hover:opacity-100 group-hover:grayscale-0")} />
                                        <div className="overflow-hidden flex-1">
                                            <p className={cn("font-bold truncate text-[14px] uppercase tracking-tight drop-shadow-sm", isActive ? "text-white" : "text-white/60")}>{other?.displayName}</p>
                                            <p className="text-[11px] text-white/30 truncate font-mono mt-1 group-hover:text-white/50 transition-colors">{c.lastMessage}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </ScrollArea>
                    </div>

                    <div className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10">
                        {selectedChatId === 'new-conversation' && pendingUser ? (
                            <ChatInterface isNewChat targetUser={pendingUser} chat={{ id: 'new', participants: [user!.uid, pendingUser.uid], participantProfiles: { [user!.uid]: { displayName: profile?.displayName || '', photoURL: profile?.photoURL || '' }, [pendingUser.uid]: { displayName: pendingUser.displayName, photoURL: pendingUser.photoURL } } } as any} />
                        ) : currentChat ? (
                            <ChatInterface chat={currentChat} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-20">
                                <MessageSquare className="h-20 w-20 text-[#D33A89] mb-6 animate-pulse drop-shadow-[0_0_15px_#D33A89]" />
                                <p className="font-mono text-[12px] uppercase tracking-[1em] text-white/60 font-bold">Link System Standby</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}