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
import React, { useState, useEffect, useRef } from "react";
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
  const isMounted = useRef(true);
  
  const isLoggedIn = !!user;

  const [isNftDialogOpen, setIsNftDialogOpen] = useState(false);
  const [nfts, setNfts] = useState<SimplifiedNft[]>([]);
  const [isSyncingNfts, setIsSyncingNfts] = useState(false);
  const [isLinkingWallet, setIsLinkingWallet] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    isMounted.current = true;
    if (!firestore || !user) {
        setUnreadMessages(0);
        return;
    }
    const q = query(collection(firestore, 'direct_chats'), where('participants', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        let totalUnread = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.unreadCount && data.unreadCount[user.uid]) {
                totalUnread += data.unreadCount[user.uid];
            }
        });
        if (isMounted.current) setUnreadMessages(totalUnread);
    });
    return () => { isMounted.current = false; unsubscribe(); };
  }, [firestore, user]);

  const hasAdminAccess = profile && ['staff', 'support', 'ghost', 'admin'].includes(profile.role || '');

  const handleLogout = async () => {
    if (auth?.currentUser) await auth.signOut();
    toast({ title: t('userNav.logoutSuccess'), variant: 'warning' });
    window.location.href = '/';
  };
  
  const handleLinkWallet = async () => {
    if (!firestore || !user) return;
    const eth = (window as any).ethereum;
    if (!eth) return toast({ variant: "destructive", title: "METAMASK_OFFLINE" });

    setIsLinkingWallet(true);
    try {
        await eth.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(eth);
        const signer = await provider.getSigner();
        const address = (await signer.getAddress()).toLowerCase();

        const q = query(collection(firestore, 'users'), where("walletAddress", "==", address));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty && querySnapshot.docs.some(doc => doc.id !== user.uid)) {
            return toast({ variant: "destructive", title: t('userNav.walletAlreadyLinkedTitle') });
        }
        await updateUserProfile(firestore, user.uid, { walletAddress: address, isWeb3Verified: true });
        toast({ title: "IDENTITY_LINKED" });
    } catch (error) {
        console.error(error);
    } finally { if (isMounted.current) setIsLinkingWallet(false); }
  };

  const handleSyncNfts = async () => {
    const walletAddr = profile?.walletAddress;
    if (!walletAddr) return toast({ variant: 'destructive', title: 'Link wallet first' });
    setIsSyncingNfts(true);
    try {
      const ownerNfts = await getNftsForOwner(walletAddr);
      setNfts(ownerNfts);
      if (ownerNfts.length > 0) setIsNftDialogOpen(true);
    } catch (error) { console.error(error); } finally { setIsSyncingNfts(false); }
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

  if (loading) return <div className="flex items-center gap-2"><Skeleton className="h-9 w-9 rounded-full" /></div>;

  if (!isLoggedIn || !user) return (
    <div className="flex items-center gap-2">
      <Button size="sm" asChild className="rounded-full bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 font-bold animate-hue-rotate h-9 px-4 text-black">
        <Link href="/login">{t('common.login')}</Link>
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
        
        {/* 消息按钮 */}
        <div className="relative h-9 w-9 rounded-full p-0.5 bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate">
            <Button asChild variant="ghost" size="icon" className="h-full w-full rounded-full bg-background hover:bg-transparent">
                <Link href="/messages">
                    <MessageSquare className="h-5 w-5" />
                    {unreadMessages > 0 && <div className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 border-2 border-background animate-pulse" />}
                </Link>
            </Button>
        </div>

        <NotificationBell />
        
        {/* 🚀 修复：Web3 钱包按钮 - 采用与 LanguageSwitcher 一致的配色 */}
        <div className="relative h-9 w-9 rounded-full p-0.5 bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-full w-full rounded-full bg-background hover:bg-transparent group transition-all" 
            onClick={handleWalletAction} 
            disabled={isSyncingNfts || isLinkingWallet}
          >
            {(isSyncingNfts || isLinkingWallet) ? (
                <Loader2 className="h-5 w-5 animate-spin text-lime-400" /> 
            ) : (
                <Wallet className={cn("h-5 w-5 transition-colors duration-300", profile?.isWeb3Verified ? "text-lime-400" : "text-white/70 group-hover:text-white")} />
            )}
          </Button>
          {/* 在线小点点 - 呼吸频率降低，极具质感 */}
          {profile?.isWeb3Verified && (
            <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-lime-500 border-2 border-background shadow-[0_0_10px_rgba(163,230,53,0.8)] animate-pulse" style={{ animationDuration: '3s' }} />
          )}
        </div>
        
        <LanguageSwitcher />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative h-9 w-9 rounded-full p-0.5 bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate outline-none hover:scale-105 transition-transform">
              <UserAvatar profile={profile || user} className="h-8 w-8" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-black/95 border-white/10 text-white backdrop-blur-3xl" align="end">
            <DropdownMenuLabel className="flex flex-col">
              <span className="text-sm font-black italic uppercase tracking-tighter text-lime-400">{profile?.displayName || user.displayName || "User"}</span>
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">{profile?.role || 'user'}_node</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="cursor-pointer"><Link href="/account"><User className="mr-2 h-4 w-4" /><span>{t('userNav.myAccount')}</span></Link></DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer"><Link href="/account/purchases"><ShoppingCart className="mr-2 h-4 w-4" /><span>{t('userNav.orders')}</span></Link></DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer"><LogOut className="mr-2 h-4 w-4" /><span>{t('userNav.logout')}</span></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative group cursor-pointer hover:scale-105 transition-all duration-300 ml-1">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500 animate-hue-rotate z-0" />
          <div className="relative h-9 rounded-full p-[1.5px] bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate z-10">
            <Button asChild className="relative h-full w-full px-4 rounded-full bg-[#0a0510] hover:bg-black border-0 m-0 flex items-center justify-center">
              <Link href="/products/new" className="flex items-center gap-1.5">
                <PlusCircle className="h-4 w-4 text-lime-400" />
                <span style={{ fontFamily: "'Press Start 2P', cursive" }} className="bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 bg-clip-text text-transparent uppercase tracking-widest text-[10px] animate-hue-rotate">ROLL OUT</span>
              </Link>
            </Button>
          </div>
        </div>
        
      </div>
    </>
  );
}