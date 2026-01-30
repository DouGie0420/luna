'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  User,
  ShoppingBag,
  ClipboardList,
  Wallet,
  ShieldCheck,
  LogOut,
  Settings,
} from 'lucide-react'
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close'

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  const isActive = (path: string) => pathname === path

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon">
        <SidebarHeader>
           <div className="flex flex-col items-center gap-2 p-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src="https://picsum.photos/seed/user-avatar/100/100" alt="@user" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="text-center group-data-[collapsible=icon]:hidden">
              <p className="font-semibold">User</p>
              <p className="text-xs text-muted-foreground">user@example.com</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/account')}>
                <Link href="/account">
                  <User />
                  Profile
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/account/listings')}>
                <Link href="/account/listings">
                  <ShoppingBag />
                  My Listings
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/account/purchases')}>
                <Link href="/account/purchases">
                  <ClipboardList />
                  My Purchases
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/account/wallet')}>
                <Link href="/account/wallet">
                  <Wallet />
                  Wallet
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/account/kyc')}>
                <Link href="/account/kyc">
                  <ShieldCheck />
                  KYC Verification
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton>
                <Settings />
                Settings
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton>
                <LogOut />
                Logout
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <PageHeaderWithBackAndClose />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
