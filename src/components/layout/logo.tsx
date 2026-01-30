import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo() {
  return (
    <Link href="/" className="relative flex items-center gap-2 p-4 group" aria-label="LUNA Home">
      <span className={cn('relative z-10 font-headline text-4xl font-bold text-foreground uppercase transition-colors duration-300 group-hover:text-primary group-hover:drop-shadow-[0_0_5px_hsl(var(--primary))]')}>
        LUNA
      </span>
    </Link>
  );
}
