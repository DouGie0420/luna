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

    // 用 per-chat 记录上一次的 unreadCount，只在某个 chat 的 unread 数量【增加】时才弹 toast
    // 这样可以彻底避免页面刷新时因两个 onSnapshot 触发顺序不同而误弹的问题
    const prevUnreadPerChat = new Map<string, number>();

    const handleSnapshot = (
      snapshot: any,
      getSender: (data: any) => string
    ) => {
      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data();
        const unread: number = data.unreadCount?.[user.uid] || 0;
        const prevUnread = prevUnreadPerChat.get(docSnap.id) ?? unread; // 首次以当前值初始化（不弹）

        if (unread > prevUnread && data.lastSenderId !== user.uid) {
          toast({
            title: (
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span>New message from {getSender(data)}</span>
              </div>
            ),
            description: (data.lastMessage || 'New message').length > 50
              ? (data.lastMessage || 'New message').substring(0, 50) + '...'
              : (data.lastMessage || 'New message'),
            duration: 5000,
          });
        }
        prevUnreadPerChat.set(docSnap.id, unread);
      });
    };

    const directQuery = query(
      collection(firestore, 'direct_chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribeDirect = onSnapshot(directQuery, (snapshot) => {
      handleSnapshot(snapshot, (data) =>
        data.participantProfiles?.[data.lastSenderId]?.displayName || 'User'
      );
    });

    const orderQuery = query(
      collection(firestore, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribeOrder = onSnapshot(orderQuery, (snapshot) => {
      handleSnapshot(snapshot, (data) =>
        data.sellerId === user.uid ? 'Buyer' : 'Seller'
      );
    });

    return () => {
      unsubscribeDirect();
      unsubscribeOrder();
    };
  }, [firestore, user, toast]);

  // 不渲染任何UI，只负责通知
  return null;
}
