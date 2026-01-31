'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { LogOut, LayoutDashboard, User, MessageSquare, ShoppingCart, PlusCircle, Wallet, ShieldCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useUser, useAuth, useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "../ui/skeleton";
import React, { useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { ethers } from 'ethers';
import { updateUserProfile } from "@/lib/user";
import { NftSelectorDialog } from "@/components/nft-selector-dialog";
import { getNftsForOwner, type SimplifiedNft } from "@/lib/alchemy";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";


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


  const handleLogout = async () => {
    if (isTestUser) {
      localStorage.removeItem('isTestUser');
    }
    // Also clear wallet user
    if (localStorage.getItem('walletUser')) {
      localStorage.removeItem('walletUser');
    }
    
    if (auth && auth.currentUser) {
      await auth.signOut();
    }

    toast({
      title: t('userNav.logout'),
      description: t('userNav.logoutSuccess'),
    });
    window.location.href = '/';
  };
  
  const handleLinkWallet = async () => {
    if (!firestore || !user || !auth) return;
    if (typeof window.ethereum === 'undefined') {
        toast({
            variant: "destructive",
            title: "MetaMask Not Found",
            description: "Please install MetaMask to use this feature.",
        });
        return;
    }
    setIsLinkingWallet(true);
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts found. Please connect your wallet.');
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        // Force refresh the token before making a Firestore write
        if (auth.currentUser) {
            await auth.currentUser.getIdToken(true);
        }

        await updateUserProfile(firestore, user.uid, {
            walletAddress: address.toLowerCase(),
            isWeb3Verified: true,
        });

        toast({
            title: "Wallet Linked!",
            description: `Your wallet ${address.slice(0, 6)}...${address.slice(-4)} is now linked.`,
        });
    } catch (error: any) {
        let message = "An unknown error occurred.";
        if (error.code === 4001) { // MetaMask user rejection
          message = "You rejected the connection request. Please try again.";
        } else if (error.message) {
          message = error.message;
        }
        
        toast({
            variant: "destructive",
            title: "Wallet Link Failed",
            description: message,
        });
    } finally {
        setIsLinkingWallet(false);
    }
  }

  const handleSyncNfts = async () => {
    const walletAddr = profile?.walletAddress;
    if (!walletAddr) {
        // This case might happen for old users who are web3 verified but don't have the address stored.
        // We can prompt them to re-link.
        toast({ variant: 'destructive', title: 'Wallet Address Not Found', description: 'Please re-link your wallet from your account page.' });
        return;
    }

    setIsSyncingNfts(true);
    try {
        const ownerNfts = await getNftsForOwner(walletAddr);
        setNfts(ownerNfts);
        if (ownerNfts.length > 0) {
            setIsNftDialogOpen(true);
        } else {
            toast({ title: 'No NFTs Found', description: 'We couldn\'t find any NFTs in your connected wallet.' });
        }
    } catch (error) {
        console.error("Error syncing NFTs:", error);
        toast({
            variant: 'destructive',
            title: 'Failed to Sync NFTs',
            description: 'Could not fetch NFT data. Please check your wallet connection or Alchemy setup.'
        });
    } finally {
        setIsSyncingNfts(false);
    }
  };

  const handleSetNftAvatar = async (nft: SimplifiedNft) => {
    if (!firestore || !user) return;
    setIsUpdatingAvatar(true);
    const dataToUpdate = {
        photoURL: nft.imageUrl,
        isNftVerified: true,
    };
    try {
        await updateUserProfile(firestore, user.uid, dataToUpdate);
        toast({
            title: 'Avatar Updated!',
            description: 'Your profile picture is now your NFT.'
        });
        setIsNftDialogOpen(false);
    } catch (error) {
        console.error(error);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'Could not set NFT as avatar.'
        });
    } finally {
        setIsUpdatingAvatar(false);
    }
  };
  
  const handleWalletAction = async () => {
    if (!isLoggedIn) {
        toast({
            title: '请先登录 LUNA 账号以关联钱包',
            variant: 'destructive'
        });
        return;
    }

    if (profile?.isWeb3Verified) {
        await handleSyncNfts();
    } else {
        await handleLinkWallet();
    }
  };


  const handleListProductClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (profile?.kycStatus !== 'Verified') {
        e.preventDefault();
        toast({
            variant: 'destructive',
            title: '需要认证',
            description: '您需要完成KYC认证后才能发布商品。',
        });
    }
  };
  
  const isLoading = isLinkingWallet || isSyncingNfts || loading;
  
  if (loading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <NftSelectorDialog open={isNftDialogOpen} onOpenChange={setIsNftDialogOpen} nfts={nfts} onSelect={handleSetNftAvatar} isUpdating={isUpdatingAvatar} />
        <div className="flex items-center gap-2">
             <Button size="sm" asChild variant="outline" className="rounded-full animate-glow border-primary text-primary hover:bg-primary/10 hover:text-primary">
                <Link href="/login">{t('common.login')}</Link>
            </Button>
            <Button size="sm" asChild variant="outline" className="rounded-full animate-glow border-primary text-primary hover:bg-primary/10 hover:text-primary">
                <Link href="/register">{t('common.register')}</Link>
            </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <NftSelectorDialog open={isNftDialogOpen} onOpenChange={setIsNftDialogOpen} nfts={nfts} onSelect={handleSetNftAvatar} isUpdating={isUpdatingAvatar} />
      <div className="flex items-center gap-2">
          <div className={cn(
            "relative h-9 w-9 rounded-full p-0.5 bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate",
            profile?.isNftVerified && 'animate-glow-pink-neon'
          )}>
              <Button
                  variant="ghost"
                  size="icon"
                  className="h-full w-full rounded-full bg-background hover:bg-transparent"
                  onClick={handleWalletAction}
                  disabled={isLoading}
                  title={t('userNav.web3Wallet')}
              >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wallet className="h-5 w-5" />}
                  <span className="sr-only">{t('userNav.web3Wallet')}</span>
              </Button>
          </div>
          <LanguageSwitcher />
          <div className="relative h-9 w-9 rounded-full p-0.5 bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate">
              <Button asChild variant="ghost" size="icon" className="h-full w-full rounded-full bg-background hover:bg-transparent">
                  <Link href="/messages" title={t('userNav.messages')}>
                      <MessageSquare className="h-5 w-5" />
                  </Link>
              </Button>
          </div>
          <div className="relative h-9 w-9 rounded-full p-0.5 bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate">
              <Button asChild variant="ghost" size="icon" className="h-full w-full rounded-full bg-background hover:bg-transparent">
                  <Link href="/account/purchases" title={t('userNav.orders')}>
                      <ShoppingCart className="h-5 w-5" />
                  </Link>
              </Button>
          </div>
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
              <button className="relative h-9 w-9 rounded-full p-0.5 bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.photoURL || user.photoURL || undefined} alt={user.displayName || 'User'} />
                      <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  {profile?.isNftVerified && (
                      <div className="absolute -bottom-1 -right-1 z-10 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 p-0.5">
                          <ShieldCheck className="h-3 w-3 text-white" />
                      </div>
                  )}
                </div>
              </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{profile?.displayName || user.displayName || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.email || user.email}
                  </p>
              </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                  <Link href="/account">
                  <User className="mr-2 h-4 w-4" />
                  <span>{t('userNav.myAccount')}</span>
                  </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                  <Link href="/account/listings">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>{t('userNav.myListings')}</span>
                  </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                  <Link href="/account/kyc">
                  <User className="mr-2 h-4 w-4" />
                  <span>{t('userNav.kycVerification')}</span>
                  </Link>
              </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('userNav.logout')}</span>
              </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild className="rounded-full bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate text-primary-foreground h-10 px-4 font-bold">
              <Link href="/products/new" onClick={handleListProductClick}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t('userNav.listAnItem')}
              </Link>
          </Button>
      </div>
    </>
  );
}
