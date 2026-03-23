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
  Star,
  ChevronLeft,
  FileText,
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useAuth, useUser } from '@/firebase'
import { useTranslation } from '@/hooks/use-translation'
import { useToast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()
  const { user, profile } = useUser()
  const auth = useAuth()
  const { toast } = useToast()

  const isActive = (path: string) => pathname === path

  const handleLogout = async () => {
    const isTestUser = user?.uid === 'test-user-uid'
    if (isTestUser) {
      localStorage.removeItem('isTestUser')
      toast({ title: t('userNav.logoutTestSuccess'), variant: 'warning' })
      window.location.href = '/'
      return
    }
    if (auth) {
      await auth.signOut()
      toast({ title: t('userNav.logoutSuccess'), variant: 'warning' })
      window.location.href = '/'
    }
  }

  const navItems = [
    { href: '/account', icon: User, label: t('accountLayout.profile') },
    { href: '/account/listings', icon: ShoppingBag, label: t('accountLayout.myListings') },
    { href: '/account/purchases', icon: ClipboardList, label: t('accountLayout.myPurchases') },
    { href: '/account/sales', icon: DollarSign, label: t('accountLayout.mySales') },
    { href: '/account/favorites', icon: Star, label: t('accountLayout.myFavorites') },
    { href: '/account/posts', icon: FileText, label: '我的帖子' },
    { href: '/account/wallet', icon: Wallet, label: t('accountLayout.wallet') },
    { href: '/account/addresses', icon: MapPin, label: t('accountLayout.addresses') },
    { href: '/account/kyc', icon: ShieldCheck, label: t('accountLayout.kycVerification') },
  ]

  return (
    <div className="flex min-h-[calc(100vh-5rem)]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 fixed top-20 left-0 bottom-0 z-[50] overflow-y-auto flex flex-col border-r border-white/8 bg-[#08000f]/70 backdrop-blur-xl">
        {/* Top accent line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

        {/* Ambient glow */}
        <div className="absolute top-1/4 -left-8 w-24 h-48 bg-purple-600/10 blur-[60px] rounded-full pointer-events-none" />

        {/* Back button */}
        <div className="px-3 pt-4 pb-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-widest font-mono"
          >
            <ChevronLeft className="w-3 h-3" />
            Back
          </button>
        </div>

        {/* Avatar section */}
        <div className="flex flex-col items-center gap-2.5 px-4 pb-4 pt-2">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-purple-500/50 to-pink-500/40 blur-md animate-pulse" />
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-purple-400/60 to-pink-400/40" />
            <UserAvatar profile={profile} className="relative h-16 w-16 ring-2 ring-background" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent leading-tight">
              {profile?.displayName || user?.displayName || 'User'}
            </p>
            <p className="text-[10px] text-white/30 mt-0.5 truncate max-w-[140px]">
              {user?.email || ''}
            </p>
          </div>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 pb-2 space-y-0.5">
          {navItems.map(({ href, icon: Icon, label }, i) => {
            const active = isActive(href)
            return (
              <motion.div
                key={href}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 relative ${
                    active
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/10 text-purple-200 border border-purple-500/25 shadow-[inset_0_1px_1px_rgba(168,85,247,0.12)]'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-purple-400' : 'text-white/30'}`} />
                  <span className="text-[13px]">{label}</span>
                  {active && (
                    <div className="ml-auto w-1 h-4 rounded-full bg-gradient-to-b from-purple-400 to-pink-400" />
                  )}
                </Link>
              </motion.div>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-2 pb-4 space-y-0.5 border-t border-white/5 pt-2">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-white/20 cursor-not-allowed">
            <Settings className="w-4 h-4 shrink-0 text-white/15" />
            <span>{t('accountLayout.settings')}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>{t('accountLayout.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main content — offset by sidebar width */}
      <main className="flex-1 min-w-0 ml-56">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
