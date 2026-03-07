'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { MessageSquare, ShoppingBag, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderChat } from '@/lib/types';

interface ChatPreview {
  id: string;
  orderId: string;
  productName?: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isSeller: boolean;
}

export default function AccountMessagesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!firestore || !user) return;

    setIsLoading(true);

    // 监听用户参与的所有订单聊天
    const chatsRef = collection(firestore, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageTimestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const chatPreviews: ChatPreview[] = [];
        let unreadTotal = 0;

        snapshot.forEach((doc) => {
          const data = doc.data() as OrderChat;
          const isSeller = data.sellerId === user.uid;
          const otherUserId = isSeller ? data.buyerId : data.sellerId;
          const unread = data.unreadCount?.[user.uid] || 0;

          chatPreviews.push({
            id: doc.id,
            orderId: data.orderId,
            productName: data.productName,
            otherUserId,
            otherUserName: isSeller ? 'Buyer' : 'Seller',
            lastMessage: data.lastMessage || 'No messages yet',
            lastMessageTime: data.lastMessageTimestamp?.toDate() || data.lastMessageTime || new Date(),
            unreadCount: unread,
            isSeller
          });

          unreadTotal += unread;
        });

        setChats(chatPreviews);
        setTotalUnread(unreadTotal);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading chats:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, user]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <span className="ml-4 text-white/60 text-lg">Loading messages...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gradient mb-2">
                Order Messages
              </h1>
              <p className="text-white/60">
                Chat with buyers and sellers about your orders
              </p>
            </div>
            {totalUnread > 0 && (
              <Badge className="bg-primary text-white text-lg px-4 py-2 animate-pulse">
                {totalUnread} unread
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-morphism p-4 rounded-xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{chats.length}</p>
                  <p className="text-sm text-white/60">Active Chats</p>
                </div>
              </div>
            </div>

            <div className="glass-morphism p-4 rounded-xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-secondary/20 rounded-lg">
                  <ShoppingBag className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{totalUnread}</p>
                  <p className="text-sm text-white/60">Unread Messages</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat List */}
        {chats.length === 0 ? (
          <div className="glass-morphism rounded-2xl border border-white/10 p-12 text-center">
            <div className="p-6 bg-white/5 rounded-2xl inline-block mb-6">
              <MessageSquare className="h-16 w-16 text-white/30" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No messages yet</h3>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              When you buy or sell products, you'll be able to chat with the other party here.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover-lift"
            >
              <ShoppingBag className="h-5 w-5" />
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {chats.map((chat) => (
              <Link
                key={chat.id}
                href={`/account/${chat.isSeller ? 'sales' : 'purchases'}/${chat.orderId}`}
                className="block"
              >
                <div
                  className={cn(
                    "glass-morphism rounded-xl border p-4 transition-all duration-200 hover-lift",
                    chat.unreadCount > 0
                      ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_rgba(255,0,255,0.1)]"
                      : "border-white/10 hover:border-white/20"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <Avatar className="h-12 w-12 border-2 border-primary/30">
                      {chat.otherUserAvatar && (
                        <AvatarImage src={chat.otherUserAvatar} />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                        {chat.otherUserName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white">
                            {chat.otherUserName}
                          </h3>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              chat.isSeller
                                ? "border-green-500/50 text-green-400"
                                : "border-blue-500/50 text-blue-400"
                            )}
                          >
                            {chat.isSeller ? 'Selling' : 'Buying'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <Clock className="h-3 w-3" />
                          {formatTime(chat.lastMessageTime)}
                        </div>
                      </div>

                      {/* Product name */}
                      {chat.productName && (
                        <p className="text-sm text-white/60 mb-2 flex items-center gap-2">
                          <ShoppingBag className="h-3 w-3" />
                          {chat.productName}
                        </p>
                      )}

                      {/* Last message */}
                      <div className="flex items-center justify-between">
                        <p
                          className={cn(
                            "text-sm truncate",
                            chat.unreadCount > 0
                              ? "text-white font-medium"
                              : "text-white/60"
                          )}
                        >
                          {chat.lastMessage}
                        </p>
                        {chat.unreadCount > 0 && (
                          <Badge className="bg-primary text-white ml-2 animate-pulse">
                            {chat.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
