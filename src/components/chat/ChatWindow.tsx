'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, Bell, BellOff, CheckCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getChatService } from '@/lib/chatService';
import type { ChatMessage } from '@/lib/types';

interface ChatWindowProps {
  orderId: string;
  sellerId: string;
  buyerId: string;
  productName?: string;
}

export function ChatWindow({ orderId, sellerId, buyerId, productName }: ChatWindowProps) {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatId = `order_${orderId}`;
  const isSeller = user?.uid === sellerId;
  const otherUserId = isSeller ? buyerId : sellerId;
  const otherUserName = isSeller ? 'Buyer' : 'Seller';

  useEffect(() => {
    if (!firestore || !user) return;

    setIsLoading(true);
    const chatService = getChatService(firestore);

    const unsubscribe = chatService.subscribeToMessages(
      chatId,
      'order',
      (newMessages) => {
        setMessages(newMessages);
        
        const unread = newMessages.filter(
          msg => !msg.read && msg.senderId !== user.uid
        ).length;
        setUnreadCount(unread);
        
        setIsLoading(false);
        scrollToBottom();

        if (unread > 0) {
          markMessagesAsRead();
        }
      },
      (error) => {
        console.error('Error listening to messages:', error);
        setIsLoading(false);
        toast({
          title: 'Connection error',
          description: 'Failed to load messages. Please refresh.',
          variant: 'destructive'
        });
      }
    );

    return () => unsubscribe();
  }, [firestore, user, chatId]);

  const markMessagesAsRead = async () => {
    if (!firestore || !user) return;
    try {
      const chatService = getChatService(firestore);
      await chatService.markAsRead(chatId, 'order', user.uid);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !firestore) return;
    
    setIsSending(true);
    const messageText = newMessage.trim();
    
    try {
      const chatService = getChatService(firestore);
      
      // 🛑 终极隔离：强制将所有参数转为字符串，消灭任何潜在的 undefined！
      const safeMessage = {
        text: String(messageText),
        senderId: String(user.uid),
        senderName: profile?.displayName ? String(profile.displayName) : 'User',
        senderAvatar: profile?.photoURL ? String(profile.photoURL) : '',
        type: 'text'
      };

      const safeMetadata = {
        productName: productName ? String(productName) : 'Target Artifact',
        orderId: orderId ? String(orderId) : ''
      };
      
      const safeOtherUserId = otherUserId ? String(otherUserId) : '';

      await chatService.sendMessage(
        chatId,
        'order',
        safeMessage,
        safeOtherUserId,
        safeMetadata
      );

      setNewMessage('');
      
      if (notificationEnabled) {
        toast({
          title: 'Message sent',
          description: 'Your message has been delivered.',
          variant: 'default'
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to send',
        description: 'There was an error sending your message. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const toggleNotifications = () => {
    setNotificationEnabled(!notificationEnabled);
    toast({
      title: notificationEnabled ? 'Notifications disabled' : 'Notifications enabled',
      description: notificationEnabled 
        ? 'You will not receive push notifications for new messages.' 
        : 'You will receive push notifications for new messages.',
      variant: 'default'
    });
  };

  const isOwnMessage = (senderId: string) => senderId === user?.uid;

  return (
    <div className="flex flex-col h-full glass-morphism rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10 bg-black/50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-gradient">Order Chat</span>
            <span className="text-xs text-white/50">#{orderId.slice(0, 8)}</span>
            {unreadCount > 0 && (
              <span className="bg-primary text-white text-xs px-2 py-1 rounded-full animate-pulse">
                {unreadCount} new
              </span>
            )}
          </h3>
          <p className="text-sm text-white/60">
            Chat with {otherUserName} • {productName || 'Product details'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleNotifications}
          className={cn(
            "rounded-full",
            notificationEnabled 
              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" 
              : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
          )}
        >
          {notificationEnabled ? <Bell className="h-4 w-4 mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
          {notificationEnabled ? 'On' : 'Off'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-white/60">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="p-4 bg-white/5 rounded-2xl mb-4">
              <Send className="h-12 w-12 text-white/30" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">No messages yet</h4>
            <p className="text-white/60 mb-6 max-w-sm">
              Start the conversation with {otherUserName}. Discuss product details, shipping, or ask questions.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${isOwnMessage(msg.senderId) ? 'justify-end' : 'justify-start'}`}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl p-4 transition-all duration-200",
                  isOwnMessage(msg.senderId) ? 'bg-primary/20 border border-primary/30' : 'bg-white/10 border border-white/10',
                  !msg.read && msg.senderId !== user?.uid && 'border-primary/50 shadow-[0_0_20px_rgba(255,0,255,0.1)]'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-6 w-6">
                    {msg.senderAvatar && <AvatarImage src={msg.senderAvatar} />}
                    <AvatarFallback className="text-xs">{(msg.senderName || 'U').charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-bold text-white">{msg.senderName || 'User'}</span>
                  <span className="text-xs text-white/40">
                    {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {!msg.read && msg.senderId === user?.uid && (
                    <span className="text-xs text-white/40 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Sent</span>
                  )}
                  {!msg.read && msg.senderId !== user?.uid && (
                    <span className="text-xs text-primary animate-pulse">New</span>
                  )}
                </div>
                <p className="text-white text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-black/40 border-white/20 text-white resize-none rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary"
            rows={2}
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={isSending || !newMessage.trim()}
            className="btn-liquid glass-morphism bg-gradient-to-r from-primary to-secondary text-white px-6 rounded-xl hover-lift min-w-[100px]"
          >
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-white/40">Press Enter to send, Shift + Enter for new line</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">{messages.length} messages</span>
            {unreadCount > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">{unreadCount} unread</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}