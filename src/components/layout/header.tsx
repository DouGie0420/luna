'use client';

import { useUser } from "@/firebase";
import { Logo } from "./logo";
import { UserNav } from "./user-nav";
import { AnnouncementBar } from "./announcement-bar";
import { GlowingPixelGrid } from "../glowing-pixel-grid";
import { Skeleton } from "@/components/ui/skeleton";

export function Header() {
  const { user, loading } = useUser();

  return (
    <header className="sticky top-0 z-[110] w-full bg-background/80 backdrop-blur-xl relative border-b border-[#c41834]/30 shadow-[0_1px_15px_rgba(196,24,52,0.1)]">
      <GlowingPixelGrid seed="shared-luna-seed" className="-z-10" />
      
      <div className="flex h-20 w-full items-center justify-between px-6 md:px-12 lg:px-16 relative">
        <div className="flex-shrink-0 hover:scale-105 transition-transform duration-300">
          {/* 🚀 恢复原版：调用刚刚净化过字体的 Logo 组件 */}
          <Logo />
        </div>

        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
          <AnnouncementBar />
        </div>

        <div className="flex items-center gap-6 flex-shrink-0">
          {loading ? (
            <Skeleton className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
          ) : (
            <div className="relative group">
              <div className="absolute -inset-2 bg-primary/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              {/* 🚀 恢复原版：调用刚刚净化过字体的 UserNav 组件 */}
              <UserNav />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}