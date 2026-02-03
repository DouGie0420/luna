'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  ClipboardList,
  LifeBuoy,
  LogOut,
  Settings,
  ShieldAlert,
  Loader2,
  Megaphone,
  MessageSquare,
  Banknote
} from 'lucide-react'

import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar'
import { Logo } from '@/components/layout/logo'
import { usePathname } from 'next/navigation'
import { useUser } from '@/firebase'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { UserProfile } from '@/lib/types'
import { useTranslation } from '@/hooks/use-translation'

const hasAdminAccess = (role?: UserProfile['role']) => {
    return role === 'admin' || role === 'staff' || role === 'support' || role === 'ghost';
}

const hasRole = (role: UserProfile['role'] | undefined, targetRoles: Array<UserProfile['role']>) => {
    if (!role) return false;
    if (role === 'admin') return true; // Admins can see everything
    return targetRoles.includes(role);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user, profile, loading } = useUser()
  const { t } = useTranslation()
  
  const isActive = (path: string) => pathname.startsWith(path);

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!user || !hasAdminAccess(profile?.role)) {
      return (
        <div className="flex h-screen w-full items-center justify-center p-4">
            <Alert variant="destructive" className="max-w-lg">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>{t('admin.layout.accessDenied')}</AlertTitle>
                <AlertDescription>
                {t('admin.layout.accessDeniedDescription')}
                </AlertDescription>
                <div className="mt-4">
                    <Link href="/" className="text-sm font-semibold underline">{t('admin.layout.goHome')}</Link>
                </div>
            </Alert>
        </div>
      )
  }

  // Check for email verification if user signed up with email/password
  // Allow access if either Auth state OR Firestore profile shows email is verified.
  if (user.providerData[0]?.providerId === 'password' && !user.emailVerified && !profile?.emailVerified) {
    return (
       <div className="flex h-screen w-full items-center justify-center p-4">
            <Alert variant="destructive" className="max-w-lg">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>{t('admin.layout.verifyEmailPrompt')}</AlertTitle>
                <AlertDescription>
                   {t('admin.layout.verifyEmailCTA')}
                </AlertDescription>
                 <div className="mt-4">
                    <Link href="/" className="text-sm font-semibold underline">{t('admin.layout.goHome')}</Link>
                </div>
            </Alert>
        </div>
    )
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/admin'}>
                <Link href="/admin">
                  <LayoutDashboard />
                  {t('admin.layout.dashboard')}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            {hasRole(profile?.role, ['admin', 'staff', 'support', 'ghost']) && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/admin/users')}>
                  <Link href="/admin/users">
                    <Users />
                    {t('admin.layout.users')}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {(hasRole(profile?.role, ['admin', 'staff'])) && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/admin/products')}>
                    <Link href="/admin/products">
                      <ShieldAlert />
                      {t('admin.layout.reviewQueue')}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/admin/promotions')}>
                    <Link href="/admin/promotions">
                      <Megaphone />
                      {t('admin.layout.promotions')}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/admin/community')}>
                    <Link href="/admin/community">
                      <MessageSquare />
                      {t('admin.layout.community')}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}

            {hasRole(profile?.role, ['admin']) && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/admin/orders')}>
                  <Link href="/admin/orders">
                    <ClipboardList />
                    {t('admin.layout.orders')}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {hasRole(profile?.role, ['admin', 'staff']) && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/admin/kyc-list')}>
                    <Link href="/admin/kyc-list">
                      <ShieldAlert />
                      {t('admin.layout.kycApplications')}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/admin/payment-requests')}>
                    <Link href="/admin/payment-requests">
                      <Banknote />
                      {t('admin.layout.paymentRequests')}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}

            {(hasRole(profile?.role, ['admin', 'support', 'ghost'])) && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/admin/support')}>
                  <Link href="/admin/support">
                    <LifeBuoy />
                    {t('admin.layout.supportTickets')}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <Settings />
                {t('admin.layout.settings')}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <LogOut />
                {t('admin.layout.logout')}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger />
            <h1 className="font-headline text-2xl font-bold">{t('admin.dashboardTitle')}</h1>
        </header>
        <div className="p-6">
            {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
