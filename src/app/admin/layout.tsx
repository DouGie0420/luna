// @ts-nocheck
'use client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { useState } from 'react';
import {
  Users, ShoppingBag, Package, DollarSign, Settings,
  HelpCircle, TrendingUp, Shield, Gift, Car, MessageSquare,
  ShieldCheck, Home, LayoutDashboard, ClipboardList, LifeBuoy,
  Award, Banknote, Megaphone
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

// 🔥 2026 AI終極修復版：強制壓制白色 + 極致玻璃 + 孟菲斯撞色
const ai2026Styles = `
  /* 強制覆蓋任何白色背景 */
  .admin-sidebar,
  .admin-sidebar * {
    background: linear-gradient(135deg, #2a1f4d 0%, #1a1333 100%) !important;
    color: white !important;
  }

  .admin-sidebar {
    backdrop-filter: blur(40px) !important;
    -webkit-backdrop-filter: blur(40px) !important;
    border-right: 1px solid rgba(255, 105, 180, 0.45) !important;
    box-shadow: 0 30px 80px rgba(255, 0, 170, 0.3) !important;
    position: relative;
    overflow: hidden;
  }

  /* 孟菲斯藝術紋理 */
  .admin-sidebar::before {
    content: '' !important;
    position: absolute !important;
    inset: 0 !important;
    opacity: 0.09 !important;
    background-image: 
      radial-gradient(circle at 30% 20%, #FFEA00 2px, transparent 2px),
      radial-gradient(circle at 70% 80%, #00FFCC 2px, transparent 2px),
      linear-gradient(45deg, transparent 48%, #FF00AA 48%, #FF00AA 52%, transparent 52%) !important;
    background-size: 62px 62px !important;
    pointer-events: none !important;
  }

  /* 導航按鈕（圓形玻璃球 + 強光效） */
  .admin-nav-item {
    background: rgba(255,255,255,0.08) !important;
    border: 1px solid rgba(255,234,0,0.35) !important;
    box-shadow: 0 15px 40px rgba(0,0,0,0.4) !important;
    transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1) !important;
  }

  .admin-nav-item:hover {
    background: rgba(255,255,255,0.18) !important;
    border-color: #FF00AA !important;
    transform: translateY(-6px) scale(1.05) !important;
    box-shadow: 0 30px 60px rgba(255,105,180,0.5) !important;
  }

  .admin-nav-active {
    background: rgba(255,105,180,0.28) !important;
    border: 2px solid #FFEA00 !important;
    box-shadow: 0 0 45px #FF00AA, 0 0 70px #00FFCC !important;
  }

  .nav-icon-wrapper {
    background: rgba(255,255,255,0.12) !important;
    border: 3px solid #FFEA00 !important;
    box-shadow: 0 0 25px rgba(255,234,0,0.6) !important;
  }

  .admin-nav-item:hover .nav-icon-wrapper {
    border-color: #FF00AA !important;
    transform: rotate(15deg) scale(1.2) !important;
    box-shadow: 0 0 40px #FF00AA !important;
  }

  /* 主內容區也加強一致性 */
  .admin-header,
  .admin-content {
    background: linear-gradient(135deg, #1a1333 0%, #2a1f4d 100%) !important;
  }

  .admin-content table {
    background: rgba(255,255,255,0.05) !important;
    border-spacing: 0 16px !important;
  }

  .admin-content tr:hover td {
    background: rgba(255,105,180,0.22) !important;
    box-shadow: 0 0 35px rgba(255,0,170,0.45) !important;
  }
`;

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
    if (path.startsWith('/admin/promotions')) return 'promotions';
    if (path.startsWith('/admin/kyc-list')) return 'kyc';
    if (path.startsWith('/admin/support')) return 'support';
    if (path.startsWith('/admin/settings')) return 'settings';
    return 'dashboard';
  };

  const activeId = getActiveId(pathname);

  const navItems = [
    { id: 'dashboard',    label: '儀表盤',     icon: <LayoutDashboard size={24} />,     path: '/admin' },
    { id: 'users',        label: '用戶管理',   icon: <Users size={24} />,               path: '/admin/users' },
    { id: 'products',     label: '商品審核',   icon: <ShoppingBag size={24} />,         path: '/admin/products' },
    { id: 'consignment',  label: '寄賣審查',   icon: <ShieldCheck size={24} />, path: '/admin/consignment' },
    { id: 'rental-reviews', label: '房源審核', icon: <Home size={24} />, path: '/admin/rental-reviews' },
    { id: 'orders',       label: '訂單管理',   icon: <ClipboardList size={24} />,       path: '/admin/orders' },
    { id: 'payments',     label: '支付請求',   icon: <Banknote size={24} />,            path: '/admin/payment-requests' },
    { id: 'promotions',   label: '促銷活動',   icon: <Megaphone size={24} />,           path: '/admin/promotions' },
    { id: 'kyc',          label: 'KYC 審核',   icon: <Shield size={24} />,              path: '/admin/kyc-list' },
    { id: 'support',      label: '客服工單',   icon: <LifeBuoy size={24} />,            path: '/admin/support' },
    { id: 'settings',     label: '系統設置',   icon: <Settings size={24} />,            path: '/admin/settings' },
  ];

  return (
    <AdminGuard>
      <style>{ai2026Styles}</style>

      <div className="flex h-screen overflow-hidden bg-[#1a1333]">
        {/* 強制深色側邊欄 */}
        <aside className={cn(
          'admin-sidebar flex flex-col h-full transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-72'
        )}>
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            {!isCollapsed && (
              <h2 className="font-black text-3xl tracking-[-2px] text-white">LUNA</h2>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-3 rounded-2xl hover:bg-white/10"
            >
              <div className={cn("w-5 h-0.5 bg-white rounded-full transition-all", isCollapsed && "rotate-45 translate-y-[3px]")} />
              <div className={cn("w-5 h-0.5 bg-white rounded-full mt-1 transition-all", isCollapsed && "-rotate-45 -translate-y-[3px]")} />
            </button>
          </div>

          <nav className="flex-1 mt-4 overflow-y-auto px-3 space-y-2">
            {navItems.map(item => {
              const isActive = activeId === item.id;
              const isConsignment = item.id === 'consignment';
              const isRental = item.id === 'rental-reviews';

              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className={cn(
                    'admin-nav-item flex items-center gap-5 px-6 py-5 rounded-3xl',
                    isActive && 'admin-nav-active',
                    isConsignment && 'nav-consignment',
                    isRental && 'nav-rental'
                  )}
                >
                  <div className="nav-icon-wrapper w-14 h-14 flex-shrink-0 rounded-full flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className={cn(
                    'text-lg font-bold tracking-wide',
                    isCollapsed && 'hidden',
                    isConsignment && 'text-[#FF00AA]',
                    isRental && 'text-[#00FFCC]'
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* 主內容區 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="admin-header px-8 py-6 flex items-center justify-between bg-black/40">
            <h1 className="text-3xl font-bold tracking-tighter text-white">
              {navItems.find(item => item.id === activeId)?.label || '系統設置'}
            </h1>
            <div className="flex gap-4">
              <button className="p-3 rounded-2xl hover:bg-white/10"><MessageSquare size={24} /></button>
              <button className="p-3 rounded-2xl hover:bg-white/10"><Settings size={24} /></button>
            </div>
          </header>

          <main className="admin-content flex-1 overflow-y-auto p-10">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}