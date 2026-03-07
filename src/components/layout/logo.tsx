import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label="LUNA Home"
      className={cn(
        'text-3xl md:text-4xl font-black tracking-[0.2em] uppercase text-white',
        'hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-cyan-400 hover:to-purple-500',
        'transition-all duration-300',
        className
      )}
      style={{ fontFamily: "'Silkscreen', 'Press Start 2P', monospace" }}
    >
      LUNA
    </Link>
  );
}