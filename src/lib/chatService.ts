import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  setDoc, // 🚀 终极修复：引入 setDoc
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
      // 杜绝 undefined
      const safeMessageData = {
        text: message.text || '',
        senderId: message.senderId || 'unknown',
        senderName: message.senderName || 'User',
        senderAvatar: message.senderAvatar || null,
        type: message.type || 'text',
        metadata: message.metadata || null,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        read: false
      };

      // 1. 添加具体消息
      const docRef = await addDoc(messagesRef, safeMessageData);

      // 2. 更新聊天元数据 (聊天房间)
      const chatRef = doc(this.firestore, collectionName, chatId);
      const displayText = message.type === 'text' ? message.text : `[${message.type}]`;
      
      // 🚀 终极修复：使用 setDoc + merge: true，如果不存在直接创建！
      await setDoc(chatRef, {
        participants: [message.senderId || 'unknown', otherUserId], // 确保建房时加入参与者
        orderId: notificationData?.orderId || chatId.replace('order_', ''),
        productName: notificationData?.productName || 'Target Artifact',
        lastMessage: displayText || '',
        lastMessageTime: serverTimestamp(),
        lastMessageTimestamp: serverTimestamp(),
        lastSenderId: message.senderId || 'unknown',
        [`unreadCount.${otherUserId}`]: increment(1),
        updatedAt: serverTimestamp()
      }, { merge: true }); // <--- 核心：如果文档不存在就创建，存在就合并修改

      // 3. 发送推送通知
      await this.sendNotification(
        {
          ...message,
          id: docRef.id,
          timestamp: new Date(),
          type: message.type || 'text',
          senderId: message.senderId || 'unknown'
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
    let orderChats: ChatPreview[] = [];
    let directChats: ChatPreview[] = [];

    const updateChats = () => {
      const allChats = [...orderChats, ...directChats].sort(
        (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
      );
      callback(allChats);
    };

    // 监听订单聊天
    const orderChatsRef = collection(this.firestore, 'chats');
    const orderQuery = query(
      orderChatsRef,
      where('participants', 'array-contains', userId)
    );

    const unsubscribeOrder = onSnapshot(
      orderQuery,
      (snapshot) => {
        orderChats = [];
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
        updateChats();
      },
      (error) => {
        console.error('Error listening to order chats:', error);
        if (onError) onError(error);
      }
    );

    // 监听直接消息
    const directChatsRef = collection(this.firestore, 'direct_chats');
    const directQuery = query(
      directChatsRef,
      where('participants', 'array-contains', userId)
    );

    const unsubscribeDirect = onSnapshot(
      directQuery,
      (snapshot) => {
        directChats = [];
        snapshot.forEach((doc) => {
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
        updateChats();
      },
      (error) => {
        console.error('Error listening to direct chats:', error);
        if (onError) onError(error);
      }
    );

    return () => {
      unsubscribeOrder();
      unsubscribeDirect();
    };
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
      // ✅ 这里同样修改为 setDoc，防止用户在房间建好前就触发已读导致崩溃
      await setDoc(chatRef, {
        [`unreadCount.${userId}`]: 0,
        updatedAt: serverTimestamp()
      }, { merge: true });
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
      const orderChatsRef = collection(this.firestore, 'chats');
      const orderQuery = query(
        orderChatsRef,
        where('participants', 'array-contains', userId)
      );
      const orderSnapshot = await getDoc(doc(this.firestore, 'chats', 'temp')); 
      
      const directChatsRef = collection(this.firestore, 'direct_chats');
      const directQuery = query(
        directChatsRef,
        where('participants', 'array-contains', userId)
      );

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
    const chatsRef = collection(this.firestore, 'direct_chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', userId1)
    );

    const newChatRef = doc(collection(this.firestore, 'direct_chats'));
    await setDoc(newChatRef, {
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
    }, { merge: true });

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
    }
  }

  /**
   * 获取未读消息总数
   */
  async getUnreadCount(userId: string): Promise<number> {
    let totalUnread = 0;

    try {
      const orderChatsRef = collection(this.firestore, 'chats');
      const orderQuery = query(
        orderChatsRef,
        where('participants', 'array-contains', userId)
      );
      
      const directChatsRef = collection(this.firestore, 'direct_chats');
      const directQuery = query(
        directChatsRef,
        where('participants', 'array-contains', userId)
      );

      return totalUnread;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}

let chatServiceInstance: ChatService | null = null;

export function getChatService(firestore: Firestore): ChatService {
  if (!chatServiceInstance || chatServiceInstance['firestore'] !== firestore) {
    chatServiceInstance = new ChatService(firestore);
  }
  return chatServiceInstance;
}