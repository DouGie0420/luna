'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { getChatService } from '@/lib/chatService';
import type { ChatMessage, DirectChat } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Send, 
  Image as ImageIcon, 
  MapPin, 
  Smile, 
  Loader2,
  MessageSquare,
  Search,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Emoji分类
const emojiCategories = {
  smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘'],
  gestures: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖']
};

interface ChatPreview {
  id: string;
  type?: 'order' | 'direct';
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

export default function MessagesPage() {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<keyof typeof emojiCategories>('smileys');
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 获取选中的聊天信息
  const selectedChat = chats.find(c => c.id === selectedChatId);

  // 监听用户的所有聊天
  useEffect(() => {
    if (!firestore || !user) return;

    setIsLoading(true);
    const chatService = getChatService(firestore);

    const unsubscribe = chatService.subscribeToUserChats(
      user.uid,
      (chatPreviews) => {
        // 显示所有聊天（包括订单聊天和直接消息）
        setChats(chatPreviews);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading chats:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, user]);

  // 监听选中聊天的消息
  useEffect(() => {
    if (!firestore || !selectedChatId) {
      setMessages([]);
      return;
    }

    const chatService = getChatService(firestore);

    const chatType = chats.find(c => c.id === selectedChatId)?.type || 'direct';

    const unsubscribe = chatService.subscribeToMessages(
      selectedChatId,
      chatType,
      (newMessages) => {
        setMessages(newMessages);
        scrollToBottom();

        // 标记为已读
        if (user) {
          chatService.markAsRead(selectedChatId, chatType, user.uid);
        }
      }
    );

    return () => unsubscribe();
  }, [firestore, selectedChatId, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !firestore || !selectedChatId || !selectedChat) return;

    setIsSending(true);
    const messageText = newMessage.trim();

    try {
      const chatService = getChatService(firestore);

      await chatService.sendMessage(
        selectedChatId,
        selectedChat.type || 'direct',
        {
          text: messageText,
          senderId: user.uid,
          senderName: profile?.displayName || 'You',
          senderAvatar: profile?.photoURL,
          type: 'text'
        },
        selectedChat.otherUserId
      );

      setNewMessage('');
      setShowEmojiPicker(false);
      inputRef.current?.focus();

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to send',
        description: 'There was an error sending your message.',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const isOwnMessage = (senderId: string) => senderId === user?.uid;

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

  // 过滤聊天列表
  const filteredChats = chats.filter(chat =>
    chat.otherUserName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
      <div className="container mx-auto p-4 h-[calc(100vh-5rem)]">
        <div className="grid grid-cols-12 gap-4 h-full">
          {/* 聊天列表 */}
          <div className="col-span-12 md:col-span-4 lg:col-span-3 glass-morphism rounded-2xl border border-white/10 overflow-hidden flex flex-col">
            {/* 搜索栏 */}
            <div className="p-4 border-b border-white/10">
              <h2 className="text-2xl font-bold text-gradient mb-4">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="pl-10 bg-black/40 border-white/20 text-white"
                />
              </div>
            </div>

            {/* 聊天列表 */}
            <div className="flex-1 overflow-y-auto">
              {filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <MessageSquare className="h-16 w-16 text-white/20 mb-4" />
                  <p className="text-white/60">No conversations yet</p>
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={cn(
                      "w-full p-4 border-b border-white/5 transition-all hover:bg-white/5",
                      selectedChatId === chat.id && "bg-primary/10 border-l-4 border-l-primary"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 border-2 border-primary/30">
                        {chat.otherUserAvatar && <AvatarImage src={chat.otherUserAvatar} />}
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                          {chat.otherUserName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-white truncate">{chat.otherUserName}</h3>
                          <span className="text-xs text-white/40 flex-shrink-0 ml-2">
                            {formatTime(chat.lastMessageTime)}
                          </span>
                        </div>
                        <p className="text-sm text-white/60 truncate">{chat.lastMessage}</p>
                      </div>
                      {chat.unreadCount > 0 && (
                        <div className="flex-shrink-0 bg-primary text-white text-xs px-2 py-1 rounded-full">
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 聊天窗口 */}
          <div className="col-span-12 md:col-span-8 lg:col-span-9 glass-morphism rounded-2xl border border-white/10 overflow-hidden flex flex-col">
            {selectedChat ? (
              <>
                {/* 聊天头部 */}
                <div className="p-4 border-b border-white/10 bg-black/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-primary/30">
                      {selectedChat.otherUserAvatar && <AvatarImage src={selectedChat.otherUserAvatar} />}
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                        {selectedChat.otherUserName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-white">{selectedChat.otherUserName}</h3>
                      <p className="text-xs text-white/60">Active now</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedChatId(null)}
                    className="md:hidden"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* 消息列表 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                        isOwnMessage(msg.senderId) ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        {msg.senderAvatar && <AvatarImage src={msg.senderAvatar} />}
                        <AvatarFallback className="text-xs">
                          {(msg.senderName || 'U').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn("flex flex-col gap-1 max-w-[70%]", isOwnMessage(msg.senderId) && "items-end")}>
                        <div
                          className={cn(
                            "relative group",
                            isOwnMessage(msg.senderId)
                              ? "bg-gradient-to-br from-[#D33A89]/40 via-[#D33A89]/20 to-transparent text-white border border-[#D33A89]/50 px-6 py-4 rounded-[1.8rem] rounded-tr-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),_0_10px_30px_rgba(211,58,137,0.25)] backdrop-blur-xl"
                              : "bg-gradient-to-br from-white/[0.1] to-white/[0.02] text-white/95 border border-white/20 px-6 py-4 rounded-[1.8rem] rounded-tl-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),_0_5px_15px_rgba(0,0,0,0.2)] backdrop-blur-xl"
                          )}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {msg.text}
                          </p>
                        </div>
                        <span className="text-xs text-white/40 px-2">
                          {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* 输入区域 */}
                <div className="p-4 border-t border-white/10 bg-black/30">
                  {/* Emoji选择器 */}
                  {showEmojiPicker && (
                    <div className="mb-4 glass-morphism rounded-xl border border-white/10 p-4">
                      <div className="flex gap-2 mb-3">
                        {Object.keys(emojiCategories).map((cat) => (
                          <Button
                            key={cat}
                            variant={emojiCategory === cat ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setEmojiCategory(cat as keyof typeof emojiCategories)}
                            className="capitalize"
                          >
                            {cat}
                          </Button>
                        ))}
                      </div>
                      <div className="grid grid-cols-8 gap-2">
                        {emojiCategories[emojiCategory].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleEmojiSelect(emoji)}
                            className="text-2xl hover:scale-125 transition-transform p-2 hover:bg-white/10 rounded-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="flex-shrink-0"
                    >
                      <Smile className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      disabled
                    >
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      disabled
                    >
                      <MapPin className="h-5 w-5" />
                    </Button>
                    <Input
                      ref={inputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Type a message..."
                      className="flex-1 bg-black/40 border-white/20 text-white"
                      disabled={isSending}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={isSending || !newMessage.trim()}
                      className="flex-shrink-0 bg-gradient-to-r from-primary to-secondary hover-lift"
                    >
                      {isSending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <MessageSquare className="h-24 w-24 text-white/20 mb-6" />
                <h3 className="text-2xl font-bold text-white mb-2">Select a conversation</h3>
                <p className="text-white/60">Choose a chat from the list to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
