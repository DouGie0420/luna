'use client';

import { useUser } from "@/firebase";
import { UserNav } from "./user-nav";
import { AnnouncementBar } from "./announcement-bar";
import { Skeleton } from "@/components/ui/skeleton";
import Link from 'next/link';

export function Header() {
  const { loading } = useUser();

  return (
    <header className="sticky top-0 z-[110] w-full bg-black/80 backdrop-blur-xl border-b border-white/10 shadow-2xl">
      <div className="flex h-24 w-full items-center justify-between px-6 md:px-12 lg:px-16">
        
        {/* 👈 强制像素 LUNA (不再使用 titanium-title，避免冲突) */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <Link href="/" className="hover:scale-105 transition-transform duration-300">
            <span className="force-pixel-brand text-xl md:text-2xl text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
              LUNA
            </span>
          </Link>
        </div>

        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
          <AnnouncementBar />
        </div>

        {/* 👉 强制像素 ROLLOUT */}
        <div className="flex items-center gap-8 flex-shrink-0">
          <div className="hidden lg:block">
             <span className="force-pixel-brand text-sm md:text-base text-white/90 tracking-widest">
                ROLLOUT
             </span>
          </div>

          {loading ? (
            <Skeleton className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
          ) : (
            <div className="relative group">
              <div className="absolute -inset-2 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <UserNav />
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        /* 🚀 暴力覆盖所有潜在样式污染 */
        .force-pixel-brand { 
            font-family: 'Press Start 2P', cursive !important; 
            font-style: normal !important;
            text-transform: uppercase !important;
            letter-spacing: 0.1em !important;
        }
      `}</style>
    </header>
  );
}