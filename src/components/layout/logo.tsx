import Link from 'next/link';
import { cn } from '@/lib/utils';
import { GlowingPixelGrid } from '../glowing-pixel-grid';

export function Logo() {
  return (
    <Link href="/" className="relative flex items-center gap-2 p-4 group" aria-label="LUNA Home">
      <div className="absolute inset-0">
        <GlowingPixelGrid pixelSize={3} glowChance={0.04} />
      </div>
      <span className={cn('relative z-10 font-headline text-4xl font-bold text-foreground uppercase transition-colors duration-300 group-hover:text-primary group-hover:drop-shadow-[0_0_5px_hsl(var(--primary))]')}>
        LUNA
      </span>
    </Link>
  );
}
