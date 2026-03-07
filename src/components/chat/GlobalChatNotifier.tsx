'use client';

import { useEffect, useRef } from 'react';
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

  // 使用 useRef 来管理状态，避免触发不必要的重渲染
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    // 关键修复 1：依赖项改为 user?.uid，防止重复触发 useEffect
    if (!firestore || !user?.uid) return;

    isFirstLoadRef.current = true;

    // --- 1. 监听直接聊天 (Direct Chats) ---
    const directChatsRef = collection(firestore, 'direct_chats');
    const directQuery = query(
      directChatsRef,
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribeDirect = onSnapshot(directQuery, (snapshot) => {
      let newMessages: Array<{ chatId: string; message: string; sender: string }> = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const unread = data.unreadCount?.[user.uid] || 0;

        // 检测新消息
        if (!isFirstLoadRef.current && unread > 0 && data.lastSenderId !== user.uid) {
          newMessages.push({
            chatId: doc.id,
            message: data.lastMessage || 'New message',
            sender: data.participantProfiles?.[data.lastSenderId]?.displayName || 'User'
          });
        }
      });

      // 显示新消息通知
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
    });

    // --- 2. 监听订单聊天 (Order Chats) - 关键修复 2：和上面平级，不再嵌套 ---
    const orderChatsRef = collection(firestore, 'chats');
    const orderQuery = query(
      orderChatsRef,
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribeOrder = onSnapshot(orderQuery, (orderSnapshot) => {
      let newMessages: Array<{ chatId: string; message: string; sender: string }> = [];

      orderSnapshot.forEach((doc) => {
        const data = doc.data();
        const unread = data.unreadCount?.[user.uid] || 0;

        // 检测新消息
        if (!isFirstLoadRef.current && unread > 0 && data.lastSenderId !== user.uid) {
          const isSeller = data.sellerId === user.uid;
          newMessages.push({
            chatId: doc.id,
            message: data.lastMessage || 'New message',
            sender: isSeller ? 'Buyer' : 'Seller'
          });
        }
      });

      // 显示新消息通知
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
    });

    // 延迟 1 秒后解除“首次加载”锁定，防止页面刚刷新时把历史未读全部弹一遍
    const timer = setTimeout(() => {
      isFirstLoadRef.current = false;
    }, 1000);

    // 关键修复 3：离开页面时，同时清理两个监听器和定时器
    return () => {
      unsubscribeDirect();
      unsubscribeOrder();
      clearTimeout(timer);
    };
  }, [firestore, user?.uid, toast]);

  // 不渲染任何UI，只负责通知
  return null;
}