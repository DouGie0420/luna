'use client';

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, LayoutDashboard, User, MessageSquare, ShoppingCart, PlusCircle, Wallet, Loader2, Star } from "lucide-react";
import Link from "next/link";
import { useUser, useAuth, useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { ethers } from 'ethers';
import { updateUserProfile } from "@/lib/user";
import { NftSelectorDialog } from "@/components/nft-selector-dialog";
import { getNftsForOwner, type SimplifiedNft } from "@/lib/alchemy";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { collection, getDocs, query, where, onSnapshot } from "firebase/firestore";
import { UserAvatar } from "@/components/ui/user-avatar";

export function UserNav() {
  const { t } = useTranslation();
  const { user, profile, loading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const isLoggedIn = !!user;
  const isTestUser = user?.uid === 'test-user-uid';

  const [isNftDialogOpen, setIsNftDialogOpen] = useState(false);
  const [nfts, setNfts] = useState<SimplifiedNft[]>([]);
  const [isSyncingNfts, setIsSyncingNfts] = useState(false);
  const [isLinkingWallet, setIsLinkingWallet] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!firestore || !user) {
        setUnreadMessages(0);
        return;
    }
    const chatsRef = collection(firestore, 'direct_chats');
    const q = query(chatsRef, where('participants', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        let totalUnread = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.unreadCount && data.unreadCount[user.uid]) {
                totalUnread += data.unreadCount[user.uid];
            }
        });
        setUnreadMessages(totalUnread);
    });
    return () => unsubscribe();
  }, [firestore, user]);

  const hasAdminAccess = profile && ['staff', 'support', 'ghost', 'admin'].includes(profile.role || '');

  const handleLogout = async () => {
    if (isTestUser) localStorage.removeItem('isTestUser');
    if (localStorage.getItem('walletUser')) localStorage.removeItem('walletUser');
    if (auth?.currentUser) await auth.signOut();
    toast({ title: t('userNav.logoutSuccess'), variant: 'warning' });
    window.location.href = '/';
  };
  
  const handleLinkWallet = async () => {
    if (!firestore || !user || !auth) return;
    if (typeof window.ethereum === 'undefined') {
        toast({ variant: "destructive", title: "MetaMask Not Found" });
        return;
    }
    setIsLinkingWallet(true);
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = (await signer.getAddress()).toLowerCase();
        const q = query(collection(firestore, 'users'), where("walletAddress", "==", address));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty && querySnapshot.docs.some(doc => doc.id !== user.uid)) {
            toast({ variant: "destructive", title: t('userNav.walletAlreadyLinkedTitle') });
            return;
        }
        await updateUserProfile(firestore, user.uid, { walletAddress: address, isWeb3Verified: true });
        toast({ title: "Wallet Linked!" });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Wallet Link Failed", description: error.message });
    } finally { setIsLinkingWallet(false); }
  };

  const handleSyncNfts = async () => {
    const walletAddr = profile?.walletAddress;
    if (!walletAddr) return toast({ variant: 'destructive', title: 'Link wallet first' });
    setIsSyncingNfts(true);
    try {
      const ownerNfts = await getNftsForOwner(walletAddr);
      setNfts(ownerNfts);
      if (ownerNfts.length > 0) setIsNftDialogOpen(true);
      else toast({ title: 'No NFTs Found' });
    } catch (error) {
      console.error(error);
    } finally { setIsSyncingNfts(false); }
  };

  const handleSetNftAvatar = async (nft: SimplifiedNft) => {
    if (!firestore || !user) return;
    setIsUpdatingAvatar(true);
    try {
      await updateUserProfile(firestore, user.uid, { photoURL: nft.imageUrl, isNftVerified: true, displayedBadge: 'nft' });
      setIsNftDialogOpen(false);
    } finally { setIsUpdatingAvatar(false); }
  };
  
  const handleWalletAction = () => profile?.isWeb3Verified ? handleSyncNfts() : handleLinkWallet();

  const handleListProductClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (profile?.kycStatus !== 'Verified') {
      toast({ variant: 'warning', title: 'KYC Recommended', description: 'Please complete KYC for better trust score.' });
    }
  };
  
  if (loading) return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-9 w-9 rounded-full" />
      <Skeleton className="h-10 w-24 rounded-full" />
    </div>
  );

  if (!isLoggedIn || !user) return (
    <div className="flex items-center gap-2">
      <Button size="sm" asChild className="rounded-full bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 text-primary-foreground font-bold animate-hue-rotate h-9 px-4">
        <Link href="/login">{t('common.login')}</Link>
      </Button>
      <Button size="sm" asChild className="rounded-full bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 text-primary-foreground font-bold animate-hue-rotate h-9 px-4">
        <Link href="/register">{t('common.register')}</Link>
      </Button>
    </div>
  );

  return (
    <>
      <NftSelectorDialog open={isNftDialogOpen} onOpenChange={setIsNftDialogOpen} nfts={nfts} onSelect={handleSetNftAvatar} isUpdating={isUpdatingAvatar} />

      <div className="flex items-center gap-3">
        
        {hasAdminAccess && (
          <div className="relative h-9 w-9 rounded-full p-0.5 bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate">
            <Button asChild variant="ghost" size="icon" className="h-full w-full rounded-full bg-background hover:bg-transparent">
              <Link href="/admin"><LayoutDashboard className="h-5 w-5" /></Link>
            </Button>
          </div>
        )}
        
        <div className="relative h-9 w-9 rounded-full p-0.5 bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate">
            <Button asChild variant="ghost" size="icon" className="h-full w-full rounded-full bg-background hover:bg-transparent">
                <Link href="/messages">
                    <MessageSquare className="h-5 w-5" />
                    {unreadMessages > 0 && (
                        <div className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 border-2 border-background animate-pulse" />
                    )}
                </Link>
            </Button>
        </div>

        <NotificationBell />
        
        <div className={cn("relative h-9 w-9 rounded-full p-0.5 bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500", profile?.isNftVerified && 'animate-glow-pink-neon')}>
          <Button variant="ghost" size="icon" className="h-full w-full rounded-full bg-background hover:bg-transparent" onClick={handleWalletAction} disabled={isSyncingNfts || isLinkingWallet}>
            {(isSyncingNfts || isLinkingWallet) ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wallet className="h-5 w-5" />}
          </Button>
        </div>
        
        <LanguageSwitcher />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative h-9 w-9 rounded-full p-0.5 bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate outline-none">
              <UserAvatar profile={profile || user} className="h-8 w-8" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                {/* 🚀 清理了潜在的 font-headline 污染 */}
                <span className="text-sm font-bold">{profile?.displayName || user.displayName || "User"}</span>
                <span className="text-xs text-muted-foreground uppercase">{profile?.role || 'user'}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild><Link href="/account"><User className="mr-2 h-4 w-4" /><span>{t('userNav.myAccount')}</span></Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/account/purchases"><ShoppingCart className="mr-2 h-4 w-4" /><span>{t('userNav.orders')}</span></Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/account/favorites"><Star className="mr-2 h-4 w-4" /><span>{t('userNav.myFavorites')}</span></Link></DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10"><LogOut className="mr-2 h-4 w-4" /><span>{t('userNav.logout')}</span></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative group cursor-pointer hover:scale-105 transition-all duration-300 ml-1">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 rounded-full blur opacity-40 group-hover:opacity-80 transition duration-500 animate-hue-rotate z-0" />
          
          <div className="relative h-9 rounded-full p-[1.5px] bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate z-10">
            <Button asChild className="relative h-full w-full px-4 rounded-full bg-[#0a0510] hover:bg-black border-0 m-0 flex items-center justify-center">
              <Link href="/products/new" onClick={handleListProductClick} className="flex items-center gap-1.5">
                <PlusCircle className="h-4 w-4 text-lime-400 group-hover:rotate-180 transition-transform duration-500" />
                
                {/* 🚀 核心修复：内联写入像素字体，去除 font-headline 污染 */}
                <span 
                  style={{ fontFamily: "'Press Start 2P', cursive" }} 
                  className="bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 bg-clip-text text-transparent uppercase tracking-widest text-[10px] animate-hue-rotate"
                >
                  ROLL OUT
                </span>
              </Link>
            </Button>
          </div>
        </div>
        
      </div>
    </>
  );
}