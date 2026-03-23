'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { MessageSquare, ShoppingBag, Clock, Loader2, Bell, BellOff, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { OrderChat } from '@/lib/types';
import { markAllNotificationsRead, markNotificationRead, getNotifIcon, type SystemNotification } from '@/lib/notify';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

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

type Tab = 'notifications' | 'chats';

export default function AccountMessagesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [tab, setTab] = useState<Tab>('notifications');
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [notifications, setNotifications] = useState<(SystemNotification & { id: string })[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(true);
  const [totalUnreadChat, setTotalUnreadChat] = useState(0);
  const [totalUnreadNotif, setTotalUnreadNotif] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  // Listen to chats
  useEffect(() => {
    if (!firestore || !user) return;
    setIsLoadingChats(true);
    const q = query(
      collection(firestore, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageTimestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      let unread = 0;
      const previews: ChatPreview[] = snapshot.docs.map(d => {
        const data = d.data() as OrderChat;
        const isSeller = data.sellerId === user.uid;
        const u = data.unreadCount?.[user.uid] || 0;
        unread += u;
        return {
          id: d.id,
          orderId: data.orderId,
          productName: data.productName,
          otherUserId: isSeller ? data.buyerId : data.sellerId,
          otherUserName: isSeller ? 'Buyer' : 'Seller',
          lastMessage: data.lastMessage || 'No messages yet',
          lastMessageTime: data.lastMessageTimestamp?.toDate() || new Date(),
          unreadCount: u,
          isSeller,
        };
      });
      setChats(previews);
      setTotalUnreadChat(unread);
      setIsLoadingChats(false);
    }, () => setIsLoadingChats(false));
  }, [firestore, user]);

  // Listen to notifications
  useEffect(() => {
    if (!firestore || !user) return;
    setIsLoadingNotifs(true);
    const q = query(
      collection(firestore, 'notifications', user.uid, 'items'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SystemNotification & { id: string }));
      setNotifications(items);
      setTotalUnreadNotif(items.filter(n => !n.isRead).length);
      setIsLoadingNotifs(false);
    }, () => setIsLoadingNotifs(false));
  }, [firestore, user]);

  const handleMarkAllRead = async () => {
    if (!firestore || !user) return;
    setMarkingAll(true);
    await markAllNotificationsRead(firestore as any, user.uid);
    setMarkingAll(false);
  };

  const handleMarkOne = async (id: string) => {
    if (!firestore || !user) return;
    await markNotificationRead(firestore as any, user.uid, id);
  };

  const formatTime = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true, locale: enUS });
    } catch { return ''; }
  };

  const totalUnread = totalUnreadChat + totalUnreadNotif;

  return (
    <div className="relative py-8 px-4 sm:px-6">
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] bg-fuchsia-600/6 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
              <Bell className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
                Inbox
              </h1>
              <p className="text-sm text-muted-foreground/70">Messages & system notifications</p>
            </div>
          </div>
          {totalUnread > 0 && (
            <Badge className="bg-red-500/20 text-red-300 border-red-500/30 px-3 py-1 text-sm">
              {totalUnread} unread
            </Badge>
          )}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/8 w-fit">
          {([
            { key: 'notifications' as Tab, label: 'System Notifications', icon: Bell, count: totalUnreadNotif },
            { key: 'chats' as Tab, label: 'Order Chats', icon: MessageSquare, count: totalUnreadChat },
          ]).map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                tab === key
                  ? 'bg-gradient-to-r from-purple-600/80 to-fuchsia-600/80 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                  : 'text-white/40 hover:text-white/70'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {count > 0 && (
                <span className="rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 shadow-[0_0_6px_rgba(239,68,68,0.6)]">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── System Notifications Tab ── */}
          {tab === 'notifications' && (
            <motion.div key="notifs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              {/* Mark all read */}
              {totalUnreadNotif > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={handleMarkAllRead}
                    disabled={markingAll}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white/50 hover:text-white border border-white/8 hover:border-white/20 transition-all"
                  >
                    {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                    Mark all as read
                  </button>
                </div>
              )}

              {isLoadingNotifs ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="relative bg-card/40 backdrop-blur-sm rounded-2xl border border-white/8 overflow-hidden">
                  <div className="p-12 text-center">
                    <div className="p-4 bg-white/5 rounded-2xl inline-flex mb-4 border border-white/8">
                      <BellOff className="h-10 w-10 text-white/25" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No notifications yet</h3>
                    <p className="text-muted-foreground/60 text-sm max-w-xs mx-auto">
                      System events like follows, likes, and order updates will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notif, idx) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <div
                        className={cn(
                          'relative rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer group',
                          !notif.isRead
                            ? 'bg-purple-500/5 border-purple-500/25 shadow-[0_0_15px_rgba(168,85,247,0.08)]'
                            : 'bg-card/30 border-white/8 hover:border-white/14'
                        )}
                        onClick={() => {
                          if (!notif.isRead) handleMarkOne(notif.id);
                        }}
                      >
                        {!notif.isRead && (
                          <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
                        )}
                        <div className="p-4 flex items-start gap-4">
                          {/* Icon */}
                          <div className={cn(
                            'shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-xl border',
                            !notif.isRead ? 'bg-purple-500/15 border-purple-500/25' : 'bg-white/5 border-white/8'
                          )}>
                            {notif.fromUserAvatar ? (
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={notif.fromUserAvatar} />
                                <AvatarFallback className="text-xs bg-purple-900/50">{notif.fromUserName?.charAt(0)}</AvatarFallback>
                              </Avatar>
                            ) : (
                              <span>{getNotifIcon(notif.type)}</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-0.5">
                              <p className={cn('text-sm font-semibold truncate', !notif.isRead ? 'text-white' : 'text-white/70')}>
                                {notif.title}
                              </p>
                              <div className="flex items-center gap-2 shrink-0">
                                {!notif.isRead && <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />}
                                <span className="text-[10px] text-white/30 font-mono">
                                  {notif.createdAt?.toDate ? formatTime(notif.createdAt.toDate()) : ''}
                                </span>
                              </div>
                            </div>
                            {notif.body && (
                              <p className="text-xs text-white/45 line-clamp-2 leading-relaxed">{notif.body}</p>
                            )}
                            {notif.link && (
                              <Link
                                href={notif.link}
                                onClick={e => e.stopPropagation()}
                                className="inline-flex mt-2 text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                              >
                                View →
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Order Chats Tab ── */}
          {tab === 'chats' && (
            <motion.div key="chats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {isLoadingChats ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                </div>
              ) : chats.length === 0 ? (
                <div className="relative bg-card/40 backdrop-blur-sm rounded-2xl border border-white/8 overflow-hidden">
                  <div className="p-12 text-center">
                    <div className="p-4 bg-white/5 rounded-2xl inline-flex mb-4 border border-white/8">
                      <MessageSquare className="h-10 w-10 text-white/25" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No messages yet</h3>
                    <p className="text-muted-foreground/60 text-sm mb-6 max-w-xs mx-auto">
                      When you buy or sell products, chat history will appear here.
                    </p>
                    <Link href="/products" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
                      <ShoppingBag className="h-4 w-4" /> Browse Products
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {chats.map((chat, idx) => (
                    <motion.div key={chat.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                      <Link href={`/account/${chat.isSeller ? 'sales' : 'purchases'}/${chat.orderId}`} className="block">
                        <div className={cn(
                          'relative bg-card/40 backdrop-blur-sm rounded-2xl border overflow-hidden transition-all duration-200',
                          chat.unreadCount > 0 ? 'border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'border-white/8 hover:border-white/14'
                        )}>
                          {chat.unreadCount > 0 && <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />}
                          <div className="p-4 flex items-start gap-4">
                            <Avatar className="h-11 w-11 border border-purple-500/25 shrink-0">
                              <AvatarFallback className="bg-gradient-to-br from-purple-600/40 to-pink-600/30 text-white text-sm">
                                {chat.otherUserName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-foreground text-sm">{chat.otherUserName}</h3>
                                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', chat.isSeller ? 'border-green-500/30 text-green-400' : 'border-blue-500/30 text-blue-400')}>
                                    {chat.isSeller ? 'Selling' : 'Buying'}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground/40">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(chat.lastMessageTime)}
                                </div>
                              </div>
                              {chat.productName && (
                                <p className="text-xs text-muted-foreground/50 mb-1.5 flex items-center gap-1.5">
                                  <ShoppingBag className="h-3 w-3" />{chat.productName}
                                </p>
                              )}
                              <div className="flex items-center justify-between">
                                <p className={cn('text-sm truncate', chat.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground/60')}>
                                  {chat.lastMessage}
                                </p>
                                {chat.unreadCount > 0 && (
                                  <span className="rounded-full bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 ml-2 shrink-0">
                                    {chat.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
