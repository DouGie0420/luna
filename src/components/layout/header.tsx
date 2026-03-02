'use client';

import { useUser, useFirestore } from "@/firebase";
import { Logo } from "./logo";
import { UserNav } from "./user-nav";
import { AnnouncementBar } from "./announcement-bar";
import { GlowingPixelGrid } from "../glowing-pixel-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MessageSquare, Shield, Globe, Zap, Wallet } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useWeb3 } from "@/contexts/Web3Context";

export function Header() {
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const { account, connectWallet } = useWeb3();
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
  };

  const getLanguageLabel = () => {
    switch (language) {
      case 'en': return 'EN';
      case 'zh': return '中文';
      case 'th': return 'ไทย';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
          
          {/* 管理员按钮 - 液态毛玻璃风格 */}
          {user && isAdmin && (
            <Link href="/admin" className="relative group">
              <div className="absolute -inset-2 bg-yellow-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative px-4 py-2 rounded-full transition-all duration-200 flex items-center gap-2 glass-morphism bg-yellow-500/10 border border-yellow-500/30 hover:border-yellow-500/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                <Shield className="h-4 w-4 text-yellow-400" />
                <span className="text-yellow-400 font-medium text-sm">Admin</span>
              </div>
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
              {/* 语言切换按钮 - 液态毛玻璃风格 */}
              <button
                onClick={toggleLanguage}
                className="relative group"
              >
                <div className="absolute -inset-2 bg-white/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative px-4 py-2 rounded-full transition-all duration-200 flex items-center gap-2 glass-morphism bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10">
                  <Globe className="h-4 w-4 text-white/70" />
                  <span className="text-white/70 font-medium text-sm">{getLanguageLabel()}</span>
                </div>
              </button>

              {user && (
                <>
                  {/* ROLL OUT 快捷发布按钮 - 液态毛玻璃风格 */}
                  <Link href="/products/new" className="relative group">
                    <div className="absolute -inset-2 bg-secondary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative px-4 py-2 rounded-full transition-all duration-200 flex items-center gap-2 glass-morphism bg-gradient-to-r from-secondary/20 to-primary/20 border border-secondary/30 hover:border-secondary/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)]">
                      <Zap className="h-4 w-4 text-secondary" />
                      <span className="text-white font-medium text-sm">ROLL OUT</span>
                    </div>
                  </Link>

                  {/* Messages按钮 - 液态毛玻璃风格 */}
                  <Link href="/messages" className="relative group">
                    <div className="absolute -inset-2 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative px-4 py-2 rounded-full transition-all duration-200 flex items-center gap-2 glass-morphism bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(255,0,255,0.3)]">
                      <MessageSquare className="h-4 w-4 text-white" />
                      <span className="text-white font-medium text-sm">Messages</span>
                      {unreadCount > 0 && (
                        <span className="bg-white text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* 钱包按钮 - 液态毛玻璃风格 */}
                  {account ? (
                    <div className="relative group">
                      <div className="absolute -inset-2 bg-green-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative px-4 py-2 rounded-full transition-all duration-200 flex items-center gap-2 glass-morphism bg-green-500/10 border border-green-500/30 hover:border-green-500/50">
                        <Wallet className="h-4 w-4 text-green-400" />
                        <span className="text-green-400 font-medium text-sm">{formatAddress(account)}</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={connectWallet}
                      className="relative group"
                    >
                      <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative px-4 py-2 rounded-full transition-all duration-200 flex items-center gap-2 glass-morphism bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                        <Wallet className="h-4 w-4 text-blue-400" />
                        <span className="text-blue-400 font-medium text-sm">Connect Wallet</span>
                      </div>
                    </button>
                  )}
                </>
              )}

              {/* 用户菜单 */}
              <UserNav />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
