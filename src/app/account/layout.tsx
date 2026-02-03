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
  MapPin,
  DollarSign,
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
import { UserAvatar } from '@/components/ui/user-avatar'
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close'
import { useAuth, useUser } from '@/firebase'
import { useTranslation } from '@/hooks/use-translation'
import { useToast } from '@/hooks/use-toast'

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { t } = useTranslation()
  const { user, profile } = useUser()
  const auth = useAuth()
  const { toast } = useToast()

  const isActive = (path: string) => pathname === path

  const handleLogout = async () => {
    const isTestUser = user?.uid === 'test-user-uid'
    if (isTestUser) {
      localStorage.removeItem('isTestUser')
      toast({
        title: t('userNav.logout'),
        description: t('userNav.logoutTestSuccess'),
      })
      window.location.href = '/' // Full reload to clear state
      return
    }

    if (auth) {
      await auth.signOut()
      toast({
        title: t('userNav.logout'),
        description: t('userNav.logoutSuccess'),
      })
      window.location.href = '/'
    }
  }

  return (
    <>
      <PageHeaderWithBackAndClose />
      <SidebarProvider>
        <Sidebar
          side="left"
          collapsible="icon"
          className="top-32 h-[calc(100svh-8rem)]"
        >
          <SidebarHeader>
            <div className="flex flex-col items-center gap-2 p-4">
              <UserAvatar profile={profile} className="h-20 w-20" />
              <div className="text-center group-data-[collapsible=icon]:hidden">
                <p className="font-semibold">
                  {profile?.displayName || user?.displayName || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/account')}>
                  <Link href="/account">
                    <User />
                    {t('accountLayout.profile')}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/account/listings')}
                >
                  <Link href="/account/listings">
                    <ShoppingBag />
                    {t('accountLayout.myListings')}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/account/purchases')}
                >
                  <Link href="/account/purchases">
                    <ClipboardList />
                    {t('accountLayout.myPurchases')}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/account/sales')}
                >
                  <Link href="/account/sales">
                    <DollarSign />
                    {t('accountLayout.mySales')}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/account/wallet')}
                >
                  <Link href="/account/wallet">
                    <Wallet />
                    {t('accountLayout.wallet')}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/account/addresses')}
                >
                  <Link href="/account/addresses">
                    <MapPin />
                    {t('accountLayout.addresses')}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/account/kyc')}>
                  <Link href="/account/kyc">
                    <ShieldCheck />
                    {t('accountLayout.kycVerification')}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <Settings />
                  {t('accountLayout.settings')}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                  <LogOut />
                  {t('accountLayout.logout')}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="pt-12">{children}</SidebarInset>
      </SidebarProvider>
    </>
  )
}
