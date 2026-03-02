'use client';

import { useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Bell } from 'lucide-react';

/**
 * GlobalChatNotifier - 全局聊天通知器
 * 只负责监听新消息并显示toast通知
 * 不再显示浮动按钮（已移到Header）
 */
export function GlobalChatNotifier() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (!firestore || !user) return;

    let lastMessageCount = 0;
    let isFirstLoad = true;

    // 监听直接消息
    const directChatsRef = collection(firestore, 'direct_chats');
    const directQuery = query(
      directChatsRef,
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribeDirect = onSnapshot(directQuery, (snapshot) => {
      let totalUnread = 0;
      let newMessages: Array<{ chatId: string; message: string; sender: string }> = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const unread = data.unreadCount?.[user.uid] || 0;
        totalUnread += unread;

        // 检测新消息
        if (!isFirstLoad && unread > 0 && data.lastSenderId !== user.uid) {
          newMessages.push({
            chatId: doc.id,
            message: data.lastMessage || 'New message',
            sender: data.participantProfiles?.[data.lastSenderId]?.displayName || 'User'
          });
        }
      });

      // 监听订单聊天
      const orderChatsRef = collection(firestore, 'chats');
      const orderQuery = query(
        orderChatsRef,
        where('participants', 'array-contains', user.uid)
      );

      onSnapshot(orderQuery, (orderSnapshot) => {
        orderSnapshot.forEach((doc) => {
          const data = doc.data();
          const unread = data.unreadCount?.[user.uid] || 0;
          totalUnread += unread;

          // 检测新消息
          if (!isFirstLoad && unread > 0 && data.lastSenderId !== user.uid) {
            const isSeller = data.sellerId === user.uid;
            newMessages.push({
              chatId: doc.id,
              message: data.lastMessage || 'New message',
              sender: isSeller ? 'Buyer' : 'Seller'
            });
          }
        });

        // 显示新消息通知
        if (!isFirstLoad && totalUnread > lastMessageCount) {
          newMessages.forEach((msg) => {
            toast({
              title: (
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <span>New message from {msg.sender}</span>
                </div>
              ),
              description: msg.message.length > 50 
                ? msg.message.substring(0, 50) + '...' 
                : msg.message,
              duration: 5000,
            });
          });
        }

        lastMessageCount = totalUnread;
        isFirstLoad = false;
      });
    });

    return () => unsubscribeDirect();
  }, [firestore, user, toast]);

  // 不渲染任何UI，只负责通知
  return null;
}
