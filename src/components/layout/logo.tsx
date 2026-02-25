import Link from 'next/link';
import { cn } from '@/lib/utils';
import { GlowingPixelGrid } from '../glowing-pixel-grid';

export function Logo() {
  return (
    <Link href="/" className="relative flex items-center gap-2 p-4 group" aria-label="LUNA Home">
       <GlowingPixelGrid className="-z-10 absolute inset-0" />
      {/* 🚀 核心修复：删除了 font-headline，强制写入像素字体 */}
      <span 
        style={{ fontFamily: "'Press Start 2P', cursive" }} 
        className={cn(
        'relative z-10 text-4xl font-bold text-foreground uppercase tracking-widest',
        'group-hover:bg-gradient-to-r group-hover:from-yellow-300 group-hover:via-lime-400 group-hover:to-violet-500 group-hover:bg-clip-text group-hover:text-transparent group-hover:animate-hue-rotate'
        )}>
        LUNA
      </span>
    </Link>
  );
}