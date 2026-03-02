'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, X, ChevronRight, Bell, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { sendPushNotification } from '@/lib/fcm';

interface ChatPreview {
  id: string;
  orderId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  productName?: string;
}

export function GlobalChatNotifier() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's chats
  useEffect(() => {
    if (!firestore || !user) return;

    setIsLoading(true);
    
    // This query would need to be adjusted based on your Firestore structure
    // Assuming chats are stored in a 'chats' collection with participants array
    const chatsRef = collection(firestore, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageTime', 'desc'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatPreviews: ChatPreview[] = [];
      let totalUnreadMessages = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const chatId = docSnap.id;
        
        // Extract orderId from chatId (assuming format: order_${orderId})
        const orderId = chatId.replace('order_', '');
        
        // Determine other user
        const otherUserId = data.participants.find((id: string) => id !== user.uid);
        const otherUserName = data.otherUserName || 'User';
        const otherUserAvatar = data.otherUserAvatar;
        
        // Get unread count from subcollection (simplified)
        // In real implementation, you'd query the messages subcollection
        const unreadCount = data.unreadCount?.[user.uid] || 0;
        
        chatPreviews.push({
          id: chatId,
          orderId,
          otherUserId,
          otherUserName,
          otherUserAvatar,
          lastMessage: data.lastMessage || 'No messages yet',
          lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
          unreadCount,
          productName: data.productName
        });

        totalUnreadMessages += unreadCount;
      });

      setChats(chatPreviews);
      setTotalUnread(totalUnreadMessages);
      setIsLoading(false);

      // Show notification for new messages
      if (totalUnreadMessages > 0 && !isOpen) {
        const newChats = chatPreviews.filter(chat => chat.unreadCount > 0);
        if (newChats.length > 0) {
          const latestChat = newChats[0];
          toast({
            title: `💬 New message from ${latestChat.otherUserName}`,
            description: latestChat.lastMessage,
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  router.push(`/account/purchases/${latestChat.orderId}`);
                  setIsOpen(false);
                }}
              >
                View
              </Button>
            )
          });
        }
      }
    }, (error) => {
      console.error('Error listening to chats:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, user, isOpen, toast, router]);

  const markChatAsRead = async (chatId: string) => {
    if (!firestore || !user) return;

    try {
      const chatRef = doc(firestore, 'chats', chatId);
      await updateDoc(chatRef, {
        [`unreadCount.${user.uid}`]: 0,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!firestore || !user) return;

    try {
      const promises = chats
        .filter(chat => chat.unreadCount > 0)
        .map(chat => {
          const chatRef = doc(firestore, 'chats', chat.id);
          return updateDoc(chatRef, {
            [`unreadCount.${user.uid}`]: 0,
            updatedAt: new Date()
          });
        });

      await Promise.all(promises);
      toast({
        title: 'All messages marked as read',
        description: 'All chat notifications have been cleared.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const openChat = (chat: ChatPreview) => {
    markChatAsRead(chat.id);
    router.push(`/account/purchases/${chat.orderId}`);
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating chat button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "relative rounded-full p-4 shadow-2xl transition-all duration-300 hover-lift",
            "bg-gradient-to-r from-primary to-purple-600 text-white",
            "hover:shadow-[0_0_30px_rgba(255,0,255,0.5)]",
            isOpen && "bg-gradient-to-r from-purple-600 to-primary"
          )}
        >
          <MessageSquare className="h-6 w-6" />
          {totalUnread > 0 && (
            <Badge className="absolute -top-2 -right-2 px-2 py-1 min-w-[24px] h-6 rounded-full bg-red-500 text-white border-2 border-black animate-pulse">
              {totalUnread > 9 ? '9+' : totalUnread}
            </Badge>
          )}
        </Button>
      </div>

      {/* Chat dropdown */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 animate-in slide-in-from-bottom-4">
          <div className="glass-morphism rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-black/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Messages</h3>
                  <p className="text-xs text-white/60">
                    {totalUnread} unread {totalUnread === 1 ? 'message' : 'messages'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {totalUnread > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs hover:bg-white/10"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Chat list */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-sm text-white/60">Loading messages...</p>
                </div>
              ) : chats.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-white/20 mx-auto mb-3" />
                  <h4 className="font-bold text-white mb-1">No messages yet</h4>
                  <p className="text-sm text-white/60">
                    Start a conversation with a seller or buyer.
                  </p>
                </div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      "p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer",
                      chat.unreadCount > 0 && "bg-primary/5"
                    )}
                    onClick={() => openChat(chat)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary/30 to-purple-600/30 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {chat.otherUserName.charAt(0)}
                          </span>
                        </div>
                        {chat.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-black flex items-center justify-center">
                            <span className="text-xs text-white font-bold">
                              {chat.unreadCount}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-white truncate">
                            {chat.otherUserName}
                          </h4>
                          <span className="text-xs text-white/40">
                            {chat.lastMessageTime.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-white/60 truncate mb-1">
                          {chat.productName || `Order #${chat.orderId.slice(0, 8)}`}
                        </p>
                        <p className={cn(
                          "text-sm truncate",
                          chat.unreadCount > 0 ? "text-white font-medium" : "text-white/50"
                        )}>
                          {chat.lastMessage}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/30" />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-black/30">
              <Button
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  router.push('/account/messages');
                  setIsOpen(false);
                }}
              >
                View all messages
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}