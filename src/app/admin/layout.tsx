// @ts-nocheck
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AdminGuard } from '@/components/admin/AdminGuard';
import {
  Banknote,
  ClipboardList,
  Home,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  Radio,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getActiveId = (path: string) => {
    if (path === '/admin') return 'dashboard';
    if (path.startsWith('/admin/users')) return 'users';
    if (path.startsWith('/admin/orders')) return 'orders';
    if (path.startsWith('/admin/products')) return 'products';
    if (path.startsWith('/admin/consignment')) return 'consignment';
    if (path.startsWith('/admin/rental-reviews')) return 'rental-reviews';
    if (path.startsWith('/admin/rentals')) return 'rentals';
    if (path.startsWith('/admin/payment-requests')) return 'payments';
    if (path.startsWith('/admin/wallet-requests')) return 'wallet-requests';
    if (path.startsWith('/admin/promotions')) return 'promotions';
    if (path.startsWith('/admin/kyc-list')) return 'kyc';
    if (path.startsWith('/admin/support')) return 'support';
    if (path.startsWith('/admin/live-settings')) return 'live-settings';
    if (path.startsWith('/admin/settings')) return 'settings';
    return 'dashboard';
  };

  const activeId = getActiveId(pathname);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
    { id: 'users', label: 'Users', icon: <Users size={20} />, path: '/admin/users' },
    { id: 'products', label: 'Products', icon: <ShoppingBag size={20} />, path: '/admin/products' },
    { id: 'consignment', label: 'Consignment', icon: <ShieldCheck size={20} />, path: '/admin/consignment' },
    { id: 'rental-reviews', label: 'Rental Reviews', icon: <Home size={20} />, path: '/admin/rental-reviews' },
    { id: 'orders', label: 'Orders', icon: <ClipboardList size={20} />, path: '/admin/orders' },
    { id: 'payments', label: 'Payment Requests', icon: <Banknote size={20} />, path: '/admin/payment-requests' },
    { id: 'wallet-requests', label: 'Wallet Requests', icon: <Wallet size={20} />, path: '/admin/wallet-requests' },
    { id: 'live-settings', label: 'Live Settings', icon: <Radio size={20} />, path: '/admin/live-settings' },
    { id: 'promotions', label: 'Promotions', icon: <Megaphone size={20} />, path: '/admin/promotions' },
    { id: 'kyc', label: 'KYC', icon: <Shield size={20} />, path: '/admin/kyc-list' },
    { id: 'support', label: 'Support', icon: <LifeBuoy size={20} />, path: '/admin/support' },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} />, path: '/admin/settings' },
  ];

  return (
    <AdminGuard>
      <div className="flex h-screen overflow-hidden bg-[#111] text-white">
        <aside
          className={cn(
            'h-full border-r border-white/10 bg-black/60 backdrop-blur-md transition-all duration-200',
            isCollapsed ? 'w-16' : 'w-72',
          )}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
            {!isCollapsed ? <h2 className="text-xl font-bold tracking-wide">LUNA ADMIN</h2> : null}
            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
              aria-label="Toggle sidebar"
            >
              {isCollapsed ? '>>' : '<<'}
            </button>
          </div>

          <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100%-64px)]">
            {navItems.map((item) => {
              const isActive = activeId === item.id;

              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                    isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!isCollapsed ? <span>{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 border-b border-white/10 bg-black/50 backdrop-blur-md px-6 flex items-center justify-between">
            <h1 className="text-lg font-semibold">
              {navItems.find((item) => item.id === activeId)?.label || 'Dashboard'}
            </h1>
            <div className="flex items-center gap-2">
              <button className="rounded-md border border-white/20 p-2 hover:bg-white/10" aria-label="Messages">
                <MessageSquare size={18} />
              </button>
              <button className="rounded-md border border-white/20 p-2 hover:bg-white/10" aria-label="Settings">
                <Settings size={18} />
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-black via-[#1a1333] to-black">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
