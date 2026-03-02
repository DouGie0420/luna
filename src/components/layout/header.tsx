'use client';

import { useUser, useFirestore } from "@/firebase";
import { Logo } from "./logo";
import { UserNav } from "./user-nav";
import { AnnouncementBar } from "./announcement-bar";
import { GlowingPixelGrid } from "../glowing-pixel-grid";
import { ConnectWalletButton } from "../ConnectWalletButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MessageSquare, Shield, Globe, Zap } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [language, setLanguage] = useState<'en' | 'zh' | 'th'>('en');

  // 检查是否是管理员
  useEffect(() => {
    if (!firestore || !user) {
      setIsAdmin(false);
      return;
    }

    const checkAdmin = async () => {
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsAdmin(userData.role === 'admin' || userData.isAdmin === true);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdmin();
  }, [firestore, user]);

  // 监听未读消息数
  useEffect(() => {
    if (!firestore || !user) {
      setUnreadCount(0);
      return;
    }

    const unsubscribers: (() => void)[] = [];

    // 监听直接消息未读数
    const directChatsRef = collection(firestore, 'direct_chats');
    const directQuery = query(
      directChatsRef,
      where('participants', 'array-contains', user.uid)
    );

    const unsubDirect = onSnapshot(directQuery, (snapshot) => {
      let directUnread = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        directUnread += data.unreadCount?.[user.uid] || 0;
      });

      // 监听订单聊天未读数
      const orderChatsRef = collection(firestore, 'chats');
      const orderQuery = query(
        orderChatsRef,
        where('participants', 'array-contains', user.uid)
      );

      const unsubOrder = onSnapshot(orderQuery, (orderSnapshot) => {
        let orderUnread = 0;
        orderSnapshot.forEach((doc) => {
          const data = doc.data();
          orderUnread += data.unreadCount?.[user.uid] || 0;
        });
        setUnreadCount(directUnread + orderUnread);
      });

      unsubscribers.push(unsubOrder);
    });

    unsubscribers.push(unsubDirect);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [firestore, user]);

  const toggleLanguage = () => {
    const languages: ('en' | 'zh' | 'th')[] = ['en', 'zh', 'th'];
    const currentIndex = languages.indexOf(language);
    const nextIndex = (currentIndex + 1) % languages.length;
    setLanguage(languages[nextIndex]);
    // TODO: 实现语言切换逻辑
  };

  const getLanguageLabel = () => {
    switch (language) {
      case 'en': return 'EN';
      case 'zh': return '中文';
      case 'th': return 'ไทย';
    }
  };

  return (
    <header className="sticky top-0 z-[110] w-full bg-background/80 backdrop-blur-xl relative border-b border-[#c41834]/30 shadow-[0_1px_15px_rgba(196,24,52,0.1)]">
      <GlowingPixelGrid seed="shared-luna-seed" className="-z-10" />
      
      <div className="flex h-20 w-full items-center justify-between px-6 md:px-12 lg:px-16 relative">
        {/* 左侧：Logo + 管理员按钮 */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="hover:scale-105 transition-transform duration-300">
            <Logo />
          </div>
          
          {/* 管理员按钮 - 只有管理员可见 */}
          {user && isAdmin && (
            <Link href="/admin">
              <Button
                variant="outline"
                size="sm"
                className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500"
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </Link>
          )}
        </div>

        {/* 中间：公告栏 */}
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
          <AnnouncementBar />
        </div>

        {/* 右侧：功能按钮 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {loading ? (
            <Skeleton className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
          ) : (
            <>
              {/* 语言切换按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <Globe className="h-4 w-4 mr-2" />
                {getLanguageLabel()}
              </Button>

              {user && (
                <>
                  {/* ROLL OUT 快捷发布按钮 */}
                  <Link href="/products/new">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-secondary to-primary hover:shadow-[0_0_20px_rgba(0,255,255,0.5)] border border-secondary/50"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      ROLL OUT
                    </Button>
                  </Link>

                  {/* Messages按钮 */}
                  <Link href="/messages" className="relative group">
                    <div className="absolute -inset-2 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className={cn(
                      "relative px-4 py-2 rounded-full transition-all duration-200 flex items-center gap-2",
                      "bg-gradient-to-r from-primary to-secondary hover:shadow-[0_0_20px_rgba(255,0,255,0.5)]",
                      "border border-primary/50 hover:border-primary"
                    )}>
                      <MessageSquare className="h-4 w-4 text-white" />
                      <span className="text-white font-medium text-sm">Messages</span>
                      {unreadCount > 0 && (
                        <span className="bg-white text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                </>
              )}

              {/* 钱包按钮 */}
              <ConnectWalletButton />

              {/* 用户菜单 */}
              <UserNav />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
