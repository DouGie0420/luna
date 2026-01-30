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

export function UserNav() {
  const { user, profile, loading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const isLoggedIn = !!user;

  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
      toast({
        title: "已退出登录",
        description: "您已成功退出。",
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
                <Link href="/login">登录</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full animate-glow border-primary text-primary hover:bg-primary/10 hover:text-primary">
                <Link href="/register">注册</Link>
            </Button>
        </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
        <Link href="/messages" title="消息">
            <MessageSquare className="h-5 w-5 text-foreground/90 hover:text-foreground" />
        </Link>
        <Link href="/account/purchases" title="订单">
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
                <span>我的页面</span>
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
                <Link href="/account/listings">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>我发布的</span>
                </Link>
            </DropdownMenuItem>
             <DropdownMenuItem asChild>
                <Link href="/account/kyc">
                <User className="mr-2 h-4 w-4" />
                <span>KYC认证</span>
                </Link>
            </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>退出登录</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>

        <Button asChild variant="default" className="rounded-none">
            <Link href="/products/new" onClick={handleListProductClick}>
                <PlusCircle className="mr-2 h-4 w-4" />
                发布
            </Link>
        </Button>
    </div>
  );
}
