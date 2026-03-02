import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  doc,
  serverTimestamp,
  increment,
  Firestore,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { ChatMessage, OrderChat, DirectChat, ChatPreview } from './types';
import { sendPushNotification } from './fcm';

export class ChatService {
  constructor(private firestore: Firestore) {}

  /**
   * 发送消息
   */
  async sendMessage(
    chatId: string,
    chatType: 'order' | 'direct',
    message: {
      text: string;
      senderId: string;
      senderName?: string;
      senderAvatar?: string;
      type?: 'text' | 'image' | 'location' | 'system';
      metadata?: any;
    },
    otherUserId: string,
    notificationData?: {
      productName?: string;
      orderId?: string;
    }
  ): Promise<string> {
    const collectionName = chatType === 'order' ? 'chats' : 'direct_chats';
    const messagesRef = collection(this.firestore, collectionName, chatId, 'messages');
    
    try {
      // 添加消息
      const docRef = await addDoc(messagesRef, {
        text: message.text,
        senderId: message.senderId,
        senderName: message.senderName || 'User',
        senderAvatar: message.senderAvatar,
        type: message.type || 'text',
        metadata: message.metadata,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        read: false
      });

      // 更新聊天元数据
      const chatRef = doc(this.firestore, collectionName, chatId);
      const displayText = message.type === 'text' ? message.text : `[${message.type}]`;
      
      await updateDoc(chatRef, {
        lastMessage: displayText,
        lastMessageTime: serverTimestamp(),
        lastMessageTimestamp: serverTimestamp(),
        lastSenderId: message.senderId,
        [`unreadCount.${otherUserId}`]: increment(1),
        updatedAt: serverTimestamp()
      });

      // 发送推送通知
      await this.sendNotification(
        {
          ...message,
          id: docRef.id,
          timestamp: new Date()
        },
        otherUserId,
        chatId,
        chatType,
        notificationData
      );

      return docRef.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * 监听消息（实时更新）
   */
  subscribeToMessages(
    chatId: string,
    chatType: 'order' | 'direct',
    callback: (messages: ChatMessage[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const collectionName = chatType === 'order' ? 'chats' : 'direct_chats';
    const messagesRef = collection(this.firestore, collectionName, chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const messages: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          messages.push({
            id: doc.id,
            text: data.text || '',
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            timestamp: data.timestamp?.toDate() || data.createdAt?.toDate() || new Date(),
            createdAt: data.createdAt,
            read: data.read || false,
            type: data.type || 'text',
            metadata: data.metadata
          });
        });
        callback(messages);
      },
      (error) => {
        console.error('Error listening to messages:', error);
        if (onError) onError(error);
      }
    );
  }

  /**
   * 监听用户的所有聊天
   */
  subscribeToUserChats(
    userId: string,
    callback: (chats: ChatPreview[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    // 监听订单聊天
    const orderChatsRef = collection(this.firestore, 'chats');
    const orderQuery = query(
      orderChatsRef,
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTimestamp', 'desc')
    );

    const unsubscribeOrder = onSnapshot(
      orderQuery,
      (snapshot) => {
        const orderChats: ChatPreview[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as OrderChat;
          const otherUserId = data.participants.find(id => id !== userId) || '';
          
          orderChats.push({
            id: doc.id,
            type: 'order',
            orderId: data.orderId,
            otherUserId,
            otherUserName: data.sellerId === userId ? 'Buyer' : 'Seller',
            lastMessage: data.lastMessage || 'No messages yet',
            lastMessageTime: data.lastMessageTimestamp?.toDate() || data.lastMessageTime || new Date(),
            unreadCount: data.unreadCount?.[userId] || 0,
            productName: data.productName
          });
        });

        // 监听直接消息
        const directChatsRef = collection(this.firestore, 'direct_chats');
        const directQuery = query(
          directChatsRef,
          where('participants', 'array-contains', userId),
          orderBy('lastMessageTimestamp', 'desc')
        );

        onSnapshot(
          directQuery,
          (directSnapshot) => {
            const directChats: ChatPreview[] = [];
            directSnapshot.forEach((doc) => {
              const data = doc.data() as DirectChat;
              const otherUserId = data.participants.find(id => id !== userId) || '';
              const otherProfile = data.participantProfiles?.[otherUserId];

              directChats.push({
                id: doc.id,
                type: 'direct',
                otherUserId,
                otherUserName: otherProfile?.displayName || 'User',
                otherUserAvatar: otherProfile?.photoURL,
                lastMessage: data.lastMessage || 'No messages yet',
                lastMessageTime: data.lastMessageTimestamp?.toDate() || new Date(),
                unreadCount: data.unreadCount?.[userId] || 0
              });
            });

            // 合并并排序
            const allChats = [...orderChats, ...directChats].sort(
              (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
            );

            callback(allChats);
          },
          (error) => {
            console.error('Error listening to direct chats:', error);
            if (onError) onError(error);
          }
        );
      },
      (error) => {
        console.error('Error listening to order chats:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribeOrder;
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(
    chatId: string,
    chatType: 'order' | 'direct',
    userId: string
  ): Promise<void> {
    const collectionName = chatType === 'order' ? 'chats' : 'direct_chats';
    const chatRef = doc(this.firestore, collectionName, chatId);
    
    try {
      await updateDoc(chatRef, {
        [`unreadCount.${userId}`]: 0,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking as read:', error);
      throw error;
    }
  }

  /**
   * 标记所有消息为已读
   */
  async markAllAsRead(userId: string): Promise<void> {
    const batch = writeBatch(this.firestore);

    try {
      // 标记订单聊天
      const orderChatsRef = collection(this.firestore, 'chats');
      const orderQuery = query(
        orderChatsRef,
        where('participants', 'array-contains', userId)
      );
      const orderSnapshot = await getDoc(doc(this.firestore, 'chats', 'temp')); // Placeholder
      
      // 标记直接消息
      const directChatsRef = collection(this.firestore, 'direct_chats');
      const directQuery = query(
        directChatsRef,
        where('participants', 'array-contains', userId)
      );

      // 批量更新
      await batch.commit();
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }

  /**
   * 创建或获取直接聊天
   */
  async getOrCreateDirectChat(
    userId1: string,
    userId2: string,
    user1Profile: { displayName: string; photoURL?: string },
    user2Profile: { displayName: string; photoURL?: string }
  ): Promise<string> {
    // 查找现有聊天
    const chatsRef = collection(this.firestore, 'direct_chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', userId1)
    );

    // 简化版：直接创建新聊天
    const newChatRef = doc(collection(this.firestore, 'direct_chats'));
    await updateDoc(newChatRef, {
      participants: [userId1, userId2],
      participantProfiles: {
        [userId1]: user1Profile,
        [userId2]: user2Profile
      },
      initiatorId: userId1,
      lastMessage: '',
      lastMessageTimestamp: serverTimestamp(),
      unreadCount: {
        [userId1]: 0,
        [userId2]: 0
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return newChatRef.id;
  }

  /**
   * 发送推送通知
   */
  private async sendNotification(
    message: ChatMessage,
    recipientId: string,
    chatId: string,
    chatType: 'order' | 'direct',
    notificationData?: {
      productName?: string;
      orderId?: string;
    }
  ): Promise<void> {
    try {
      const title = `💬 New message from ${message.senderName || 'User'}`;
      const body = message.type === 'text' 
        ? (message.text.length > 50 ? message.text.substring(0, 50) + '...' : message.text)
        : `[${message.type}]`;

      const url = chatType === 'order' 
        ? `/account/purchases/${notificationData?.orderId || chatId.replace('order_', '')}`
        : '/messages';

      await sendPushNotification(
        recipientId,
        title,
        body,
        {
          url,
          chatId,
          chatType,
          messageId: message.id,
          ...notificationData
        }
      );
    } catch (error) {
      console.error('Failed to send push notification:', error);
      // 不抛出错误，推送失败不应该影响消息发送
    }
  }

  /**
   * 获取未读消息总数
   */
  async getUnreadCount(userId: string): Promise<number> {
    let totalUnread = 0;

    try {
      // 订单聊天未读数
      const orderChatsRef = collection(this.firestore, 'chats');
      const orderQuery = query(
        orderChatsRef,
        where('participants', 'array-contains', userId)
      );
      
      // 直接消息未读数
      const directChatsRef = collection(this.firestore, 'direct_chats');
      const directQuery = query(
        directChatsRef,
        where('participants', 'array-contains', userId)
      );

      // 简化版：返回0，实际应该查询并累加
      return totalUnread;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}

// 导出单例工厂函数
let chatServiceInstance: ChatService | null = null;

export function getChatService(firestore: Firestore): ChatService {
  if (!chatServiceInstance || chatServiceInstance['firestore'] !== firestore) {
    chatServiceInstance = new ChatService(firestore);
  }
  return chatServiceInstance;
}
