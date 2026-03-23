'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useTranslation } from '@/hooks/use-translation';
import { Logo } from './logo';
import { UserNav } from './user-nav';
import { AnnouncementBar } from './announcement-bar';
import { GlowingPixelGrid } from '../glowing-pixel-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Shield, Globe, Zap, Wallet, UserPlus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { useWeb3 } from '@/contexts/Web3Context';
import { WalletDropdown } from '../wallet/WalletDropdown';

const baseActionButton =
  'inline-flex h-10 items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 sm:px-4 text-sm font-semibold text-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-200 hover:border-white/40 hover:bg-black/55';

export function Header() {
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const { account, connectWallet, isConnecting } = useWeb3();
  const { t, language, setLanguage } = useTranslation();

  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!firestore || !user) {
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
  }, [firestore, user]);

  useEffect(() => {
    if (!firestore || !user) {
      setUnreadCount(0);
      return;
    }

    let directUnread = 0;
    let orderUnread = 0;
    let notifUnread = 0;

    const pushUnreadCount = () => {
      setUnreadCount(directUnread + orderUnread + notifUnread);
    };

    const directQuery = query(
      collection(firestore, 'direct_chats'),
      where('participants', 'array-contains', user.uid),
    );

    const orderQuery = query(
      collection(firestore, 'chats'),
      where('participants', 'array-contains', user.uid),
    );

    const notifQuery = query(
      collection(firestore, 'notifications', user.uid, 'items'),
      where('isRead', '==', false),
    );

    const unsubDirect = onSnapshot(directQuery, (snapshot) => {
      directUnread = snapshot.docs.reduce((sum, docSnap) => {
        const data = docSnap.data();
        return sum + (data.unreadCount?.[user.uid] || 0);
      }, 0);
      pushUnreadCount();
    });

    const unsubOrder = onSnapshot(orderQuery, (snapshot) => {
      orderUnread = snapshot.docs.reduce((sum, docSnap) => {
        const data = docSnap.data();
        return sum + (data.unreadCount?.[user.uid] || 0);
      }, 0);
      pushUnreadCount();
    });

    const unsubNotif = onSnapshot(notifQuery, (snapshot) => {
      notifUnread = snapshot.size;
      pushUnreadCount();
    });

    return () => {
      unsubDirect();
      unsubOrder();
      unsubNotif();
    };
  }, [firestore, user]);

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
                  <span className="hidden sm:inline">{t('header.admin')}</span>
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
                    <span className="hidden md:inline">{t('header.rollOut')}</span>
                  </Link>

                  <Link href="/messages" className={baseActionButton}>
                    <MessageSquare className="h-4 w-4 text-white/70" />
                    <span className="hidden md:inline">{t('header.messages')}</span>
                    {unreadCount > 0 ? (
                      <span className="rounded-full bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : null}
                  </Link>

                  {account ? (
                    <WalletDropdown />
                  ) : (
                    <button
                      onClick={() => connectWallet().catch(err => console.error('[ConnectWallet]', err))}
                      disabled={isConnecting}
                      className={`${baseActionButton} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isConnecting
                        ? <Loader2 className="h-4 w-4 animate-spin text-white/70" />
                        : <Wallet className="h-4 w-4 text-white/70" />
                      }
                      <span className="hidden md:inline">{isConnecting ? t('header.connecting') : t('header.connectWallet')}</span>
                    </button>
                  )}
                </>
              ) : (
                <Link href="/register" className={baseActionButton}>
                  <UserPlus className="h-4 w-4 text-white/70" />
                  <span className="hidden sm:inline">{t('header.signUp')}</span>
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
