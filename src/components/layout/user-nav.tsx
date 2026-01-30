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
import { LogOut, LayoutDashboard, User, MessageSquare, ShoppingCart, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useUser, useAuth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "../ui/skeleton";
import React from "react";
import { useTranslation } from "@/hooks/use-translation";

export function UserNav() {
  const { t } = useTranslation();
  const { user, profile, loading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const isLoggedIn = !!user;
  const isTestUser = user?.uid === 'test-user-uid';

  const handleLogout = async () => {
    if (isTestUser) {
      localStorage.removeItem('isTestUser');
      toast({
        title: t('userNav.logout'),
        description: t('userNav.logoutTestSuccess'),
      });
      window.location.href = '/'; // Full reload to clear state
      return;
    }
    
    if (auth) {
      await auth.signOut();
      toast({
        title: t('userNav.logout'),
        description: t('userNav.logoutSuccess'),
      });
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
  
  if (loading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
        <div className="flex items-center gap-2">
             <Button asChild variant="default" className="rounded-full animate-glow">
                <Link href="/login">{t('common.login')}</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full animate-glow border-primary text-primary hover:bg-primary/10 hover:text-primary">
                <Link href="/register">{t('common.register')}</Link>
            </Button>
        </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
        <Link href="/messages" title={t('userNav.messages')}>
            <MessageSquare className="h-5 w-5 text-foreground/90 hover:text-foreground" />
        </Link>
        <Link href="/account/purchases" title={t('userNav.orders')}>
            <ShoppingCart className="h-5 w-5 text-foreground/90 hover:text-foreground" />
        </Link>
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-none p-0">
            <Avatar className="h-8 w-8">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
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

        <Button asChild variant="ghost" className="rounded-full bg-lime-400/20 text-lime-300 border border-lime-400/50 hover:bg-lime-400/30 hover:text-lime-200 h-10 px-4">
            <Link href="/products/new" onClick={handleListProductClick}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('userNav.listAnItem')}
            </Link>
        </Button>
    </div>
  );
}
