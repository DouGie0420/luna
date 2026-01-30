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
import { LogOut, LayoutDashboard, User, MessageSquare, ShoppingCart } from "lucide-react";
import Link from "next/link";

export function UserNav() {
  // In a real app, you'd get the user's session status here.
  const isLoggedIn = true; 

  if (!isLoggedIn) {
    return (
        <div className="flex items-center gap-2 text-sm font-medium text-primary-foreground">
            <Link href="/login" className="hover:underline">登录</Link>
            <div className="h-3 w-px bg-primary-foreground/50" />
            <Link href="/register" className="hover:underline">注册</Link>
        </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
        <Link href="/messages" title="消息">
            <MessageSquare className="h-5 w-5 text-primary-foreground/90 hover:text-primary-foreground" />
        </Link>
        <Link href="/account/purchases" title="订单">
            <ShoppingCart className="h-5 w-5 text-primary-foreground/90 hover:text-primary-foreground" />
        </Link>
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
                <AvatarImage src="https://picsum.photos/seed/user-avatar/100/100" alt="@user" />
                <AvatarFallback>U</AvatarFallback>
            </Avatar>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">User</p>
                <p className="text-xs leading-none text-muted-foreground">
                  user@example.com
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
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
            <LogOut className="mr-2 h-4 w-4" />
            <span>退出登录</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
}
