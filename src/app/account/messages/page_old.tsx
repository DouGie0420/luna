'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  MessageSquare, Search, Filter, 
  CheckCircle, Clock, ChevronRight,
  User, Store, Package, Shield,
  Loader2, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  productImage?: string;
  orderStatus?: string;
}

export default function MessagesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'orders'>('all');

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
          productName: data.productName,
          productImage: data.productImage,
          orderStatus: data.orderStatus
        });
      });

      setChats(chatPreviews);
      setFilteredChats(chatPreviews);
      setIsLoading(false);
    }, (error) => {
      console.error('Error listening to chats:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, user]);

  // Apply filters and search
  useEffect(() => {
    let result = chats;
    
    // Apply filter
    if (activeFilter === 'unread') {
      result = result.filter(chat => chat.unreadCount > 0);
    } else if (activeFilter === 'orders') {
      result = result.filter(chat => chat.orderId && chat.orderId !== 'undefined');
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(chat => 
        chat.otherUserName.toLowerCase().includes(query) ||
        chat.lastMessage.toLowerCase().includes(query) ||
        chat.productName?.toLowerCase().includes(query)
      );
    }
    
    setFilteredChats(result);
  }, [chats, searchQuery, activeFilter]);

  const markChatAsRead = async (chatId: string) => {
    if (!firestore || !user) return;

    try {
      const chatRef = doc(firestore, 'chats', chatId);
      await updateDoc(chatRef, {
        [`unreadCount.${user.uid}`]: 0,
        updatedAt: new Date()
      });
      
      toast({
        title: 'Marked as read',
        description: 'All messages in this chat have been marked as read.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error marking chat as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark messages as read.',
        variant: 'destructive'
      });
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
      toast({
        title: 'Error',
        description: 'Failed to mark all messages as read.',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'pending':
        return <Clock className="h-3 w-3 text-yellow-500" />;
      case 'shipped':
        return <Package className="h-3 w-3 text-blue-500" />;
      case 'disputed':
        return <Shield className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020203] to-[#0a0a0f]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#020203]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Messages</h1>
              <p className="text-white/60 mt-1">
                {totalUnread > 0 
                  ? `${totalUnread} unread message${totalUnread === 1 ? '' : 's'}`
                  : 'All caught up!'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {totalUnread > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark all read
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/account/purchases')}
                className="text-white/60 hover:text-white"
              >
                View Orders
              </Button>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                type="text"
                placeholder="Search messages, people, or products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-white/40 hover:text-white" />
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={activeFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveFilter('all')}
                className={cn(
                  "rounded-lg",
                  activeFilter === 'all'
                    ? "bg-primary text-white"
                    : "text-white/60 hover:text-white border-white/20"
                )}
              >
                All
              </Button>
              <Button
                variant={activeFilter === 'unread' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveFilter('unread')}
                className={cn(
                  "rounded-lg",
                  activeFilter === 'unread'
                    ? "bg-primary text-white"
                    : "text-white/60 hover:text-white border-white/20"
                )}
              >
                Unread {totalUnread > 0 && `(${totalUnread})`}
              </Button>
              <Button
                variant={activeFilter === 'orders' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveFilter('orders')}
                className={cn(
                  "rounded-lg",
                  activeFilter === 'orders'
                    ? "bg-primary text-white"
                    : "text-white/60 hover:text-white border-white/20"
                )}
              >
                Orders
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-white/60">Loading messages...</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <Card className="bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[40px] p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-white/5 rounded-3xl inline-flex mb-6">
                <MessageSquare className="h-12 w-12 text-white/30" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">No messages yet</h3>
              <p className="text-white/60 mb-8">
                {searchQuery || activeFilter !== 'all'
                  ? 'No messages match your search criteria.'
                  : 'Start a conversation with a seller or buyer to see messages here.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => router.push('/')}
                  className="bg-gradient-to-r from-primary to-purple-600 text-white"
                >
                  Browse Products
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/account/purchases')}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  View Purchases
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredChats.map((chat) => (
              <Card
                key={chat.id}
                className={cn(
                  "bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all duration-300 cursor-pointer hover:shadow-xl",
                  chat.unreadCount > 0 && "border-primary/30 bg-primary/5"
                )}
                onClick={() => router.push(`/account/purchases/${chat.orderId}`)}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="h-14 w-14">
                      {chat.otherUserAvatar && <AvatarImage src={chat.otherUserAvatar} />}
                      <AvatarFallback className="bg-gradient-to-r from-primary/20 to-purple-600/20 text-white text-lg">
                        {chat.otherUserName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {chat.unreadCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-red-500 text-white border-2 border-[#080808] min-w-[24px] h-6">
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white truncate">{chat.otherUserName}</h3>
                        {chat.orderStatus && getStatusIcon(chat.orderStatus)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">
                          {chat.lastMessageTime.toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <ChevronRight className="h-4 w-4 text-white/40" />
                      </div>
                    </div>
                    
                    {/* Product Info */}
                    {chat.productName && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-xs text-white/40 flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Order #{chat.orderId?.slice(0, 8)}
                        </div>
                        <span className="text-xs text-white/60 truncate">
                          {chat.productName}
                        </span>
                      </div>
                    )}
                    
                    {/* Last Message */}
                    <p className={cn(
                      "text-sm truncate",
                      chat.unreadCount > 0 ? "text-white font-medium" : "text-white/60"
                    )}>
                      {chat.lastMessage}
                    </p>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markChatAsRead(chat.id);
                        }}
                        className="text-xs text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Mark read
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/account/purchases/${chat.orderId}`);
                        }}
                        className="text-xs text-white/60 hover:text-white hover:bg-white/10"
                      >
                        View Order
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        
        {/* Stats */}
        {!isLoading && chats.length > 0 && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-white/5 border-white/5 p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Total Chats</p>
                  <p className="text-2xl font-bold text-white">{chats.length}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary/60" />
              </div>
            </Card>
            <Card className="bg-white/5 border-white/5 p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Unread Messages</p>
                  <p className="text-2xl font-bold text-white">{totalUnread}</p>
                </div>
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Badge className="bg-red-500 text-white">{totalUnread}</Badge>
                </div>
              </div>
            </Card>
            <Card className="bg-white/5 border-white/5 p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/60">Active Orders</p>
                  <p className="text-2xl font-bold text-white">
                    {chats.filter(c => c.orderId && c.orderId !== 'undefined').length}
                  </p>
                </div>
                <Package className="h-8 w-8 text-green-500/60" />
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}