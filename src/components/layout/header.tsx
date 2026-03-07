'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { Logo } from './logo';
import { UserNav } from './user-nav';
import { AnnouncementBar } from './announcement-bar';
import { GlowingPixelGrid } from '../glowing-pixel-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Shield, Globe, Zap, Wallet, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { useWeb3 } from '@/contexts/Web3Context';
import { WalletDropdown } from '../wallet/WalletDropdown';

const baseActionButton =
  'inline-flex h-10 items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 sm:px-4 text-sm font-semibold text-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-200 hover:border-white/40 hover:bg-black/55';

export function Header() {
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const { account, connectWallet } = useWeb3();

  // 将总未读数拆分为两个独立状态，避免闭包变量导致的数据错乱
  const [directUnreadCount, setDirectUnreadCount] = useState(0);
  const [orderUnreadCount, setOrderUnreadCount] = useState(0);
  const unreadCount = directUnreadCount + orderUnreadCount;
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [language, setLanguage] = useState<'en' | 'zh' | 'th'>('en');

  // 1. 检查管理员权限的 Effect
  useEffect(() => {
    if (!firestore || !user?.uid) {
      setIsAdmin(false);
      return;
    }

    const checkAdmin = async () => {
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (!userDoc.exists()) {
          setIsAdmin(false);
          return;
        }

        const role = userDoc.data().role;
        setIsAdmin(['admin', 'ghost', 'staff', 'support'].includes(role));
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdmin().catch(console.error);
  }, [firestore, user?.uid]); // 关键修复：依赖项改为 user?.uid

  // 2. 监听消息未读数的 Effect
  useEffect(() => {
    if (!firestore || !user?.uid) {
      setDirectUnreadCount(0);
      setOrderUnreadCount(0);
      return;
    }

    const directQuery = query(
      collection(firestore, 'direct_chats'),
      where('participants', 'array-contains', user.uid),
    );

    const orderQuery = query(
      collection(firestore, 'chats'),
      where('participants', 'array-contains', user.uid),
    );

    const unsubDirect = onSnapshot(directQuery, (snapshot) => {
      const count = snapshot.docs.reduce((sum, docSnap) => {
        const data = docSnap.data();
        return sum + (data.unreadCount?.[user.uid] || 0);
      }, 0);
      setDirectUnreadCount(count); // 直接更新对应状态
    });

    const unsubOrder = onSnapshot(orderQuery, (snapshot) => {
      const count = snapshot.docs.reduce((sum, docSnap) => {
        const data = docSnap.data();
        return sum + (data.unreadCount?.[user.uid] || 0);
      }, 0);
      setOrderUnreadCount(count); // 直接更新对应状态
    });

    return () => {
      unsubDirect();
      unsubOrder();
    };
  }, [firestore, user?.uid]); // 关键修复：依赖项改为 user?.uid

  const toggleLanguage = () => {
    const sequence: Array<'en' | 'zh' | 'th'> = ['en', 'zh', 'th'];
    const currentIndex = sequence.indexOf(language);
    setLanguage(sequence[(currentIndex + 1) % sequence.length]);
  };

  const languageLabel = useMemo(() => {
    if (language === 'zh') return '中文';
    if (language === 'th') return 'ไทย';
    return 'EN';
  }, [language]);

  return (
    <header className="sticky top-0 z-[110] w-full bg-background/80 backdrop-blur-xl relative border-b border-[#c41834]/30 shadow-[0_1px_15px_rgba(196,24,52,0.1)]">
      <GlowingPixelGrid seed="shared-luna-seed" className="-z-10" />

      <div className="flex h-20 w-full items-center justify-between gap-3 px-4 md:px-8 lg:px-12 relative">
        <div className="flex items-center gap-3 shrink-0">
          <Logo />
        </div>

        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
          <AnnouncementBar />
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {loading ? (
            <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
          ) : (
            <>
              {user && isAdmin ? (
                <Link href="/admin" className={`${baseActionButton} border-yellow-500/40 text-yellow-300 hover:border-yellow-400`}>
                  <Shield className="h-4 w-4 text-yellow-300" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              ) : null}

              <button onClick={toggleLanguage} className={baseActionButton}>
                <Globe className="h-4 w-4 text-white/70" />
                <span>{languageLabel}</span>
              </button>

              {user ? (
                <>
                  <Link href="/products/new" className={baseActionButton}>
                    <Zap className="h-4 w-4 text-white/70" />
                    <span className="hidden md:inline">ROLL OUT</span>
                  </Link>

                  <Link href="/messages" className={baseActionButton}>
                    <MessageSquare className="h-4 w-4 text-white/70" />
                    <span className="hidden md:inline">MESSAGES</span>
                    {unreadCount > 0 ? (
                      <span className="rounded-full bg-white text-black text-[10px] font-bold px-2 py-0.5">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : null}
                  </Link>

                  {account ? (
                    <WalletDropdown />
                  ) : (
                    <button onClick={connectWallet} className={baseActionButton}>
                      <Wallet className="h-4 w-4 text-white/70" />
                      <span className="hidden md:inline">Connect Wallet</span>
                    </button>
                  )}
                </>
              ) : (
                <Link href="/register" className={baseActionButton}>
                  <UserPlus className="h-4 w-4 text-white/70" />
                  <span className="hidden sm:inline">Sign Up</span>
                </Link>
              )}

              <UserNav />
            </>
          )}
        </div>
      </div>
    </header>
  );
}