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
    <header className="sticky top-0 z-40 w-full bg-background relative border-b border-white/5">
      <GlowingPixelGrid seed="shared-luna-seed" className="-z-10" />
      <div className="container mx-auto flex h-20 items-center justify-between gap-8 px-4">
        {/* 左侧 Logo */}
        <Logo />

        {/* 中间 公告栏 (仅 PC) */}
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
          <AnnouncementBar />
        </div>

        {/* 右侧 用户导航 */}
        <div className="flex items-center gap-4">
          {loading ? (
            // 加载中显示骨架屏，防止 UI 跳动
            <Skeleton className="h-10 w-10 rounded-full" />
          ) : (
            // 只有加载完成后才渲染 UserNav，UserNav 内部通常包含通知查询
            <UserNav />
          )}
        </div>
      </div>
    </header>
  );
}
