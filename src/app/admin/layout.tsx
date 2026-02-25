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
  Banknote,
  Award,
  Radio,
  Home, // 🚀 引入房源图标
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

type Role = NonNullable<UserProfile['role']>;

// Centralized permission check function
const hasRole = (userRole: Role | undefined, allowedRoles: Array<Role>): boolean => {
    if (!userRole) return false;
    if (userRole === 'admin' || userRole === 'ghost') return true;
    return allowedRoles.includes(userRole);
}

// Page-specific permissions
const pagePermissions: Record<string, Array<Role>> = {
    '/admin': ['admin', 'ghost', 'staff', 'support'],
    '/admin/users': ['admin', 'ghost', 'staff'],
    '/admin/products': ['admin', 'ghost', 'staff'],
    '/admin/rental-reviews': ['admin', 'ghost', 'staff'], // 🚀 房源审核权限：Admin, Ghost, Staff
    '/admin/promotions': ['admin', 'ghost', 'staff'],
    '/admin/community': ['admin', 'ghost', 'staff'],
    '/admin/orders': ['admin', 'ghost', 'staff', 'support'],
    '/admin/kyc-list': ['admin', 'ghost', 'staff', 'support'],
    '/admin/payment-requests': ['admin', 'ghost', 'staff', 'support'],
    '/admin/pro-applications': ['admin', 'ghost', 'staff', 'support'],
    '/admin/support': ['admin', 'ghost', 'staff', 'support'],
    '/admin/live-settings': ['admin', 'ghost'],
};


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user, profile, loading } = useUser()
  const { t } = useTranslation()
  
  const isActive = (path: string) => pathname.startsWith(path);
  const userRole = profile?.role;

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!user || !userRole || !['admin', 'ghost', 'staff', 'support'].includes(userRole)) {
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

  const canAccessCurrentPage = Object.entries(pagePermissions).some(([page, roles]) => 
      pathname.startsWith(page) && hasRole(userRole, roles)
  );

  const mainContent = canAccessCurrentPage ? children : (
     <div className="flex h-full w-full items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-lg">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>{t('admin.layout.accessDenied')}</AlertTitle>
            <AlertDescription>
                您的角色 (<strong>{userRole}</strong>) 没有权限访问此页面。
            </AlertDescription>
        </Alert>
    </div>
  );

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
            {hasRole(userRole, ['staff', 'support']) && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/admin'}>
                  <Link href="/admin">
                    <LayoutDashboard />
                    {t('admin.layout.dashboard')}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            
            {hasRole(userRole, ['staff']) && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/admin/users')}>
                  <Link href="/admin/users">
                    <Users />
                    {t('admin.layout.users')}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {hasRole(userRole, ['staff']) && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/admin/products')}>
                    <Link href="/admin/products">
                      <ShoppingBag />
                      商品审核
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                {/* 🚀 新增：房源审核入口 */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/admin/rental-reviews')}>
                    <Link href="/admin/rental-reviews">
                      <Home className="text-purple-400" />
                      <span className="font-bold text-purple-300">房源审核</span>
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
            
            {hasRole(userRole, []) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/admin/live-settings')}>
                    <Link href="/admin/live-settings">
                      <Radio />
                      {t('admin.layout.liveSettings')}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            )}

            {hasRole(userRole, ['staff', 'support']) && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/admin/orders')}>
                  <Link href="/admin/orders">
                    <ClipboardList />
                    {t('admin.layout.orders')}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            
            {hasRole(userRole, ['staff', 'support']) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/admin/kyc-list')}>
                    <Link href="/admin/kyc-list">
                      <ShieldAlert />
                      {t('admin.layout.kycApplications')}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            )}
            
            {hasRole(userRole, ['staff', 'support']) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/admin/pro-applications')}>
                    <Link href="/admin/pro-applications">
                      <Award />
                      PRO 申请
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            )}

            {hasRole(userRole, ['staff', 'support']) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/admin/payment-requests')}>
                    <Link href="/admin/payment-requests">
                      <Banknote />
                      {t('admin.layout.paymentRequests')}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            )}

            {hasRole(userRole, ['staff', 'support']) && (
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
              <SidebarMenuButton disabled>
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
            {mainContent}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}