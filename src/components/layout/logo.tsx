import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="LUNA Home">
      <span className={cn('font-headline text-4xl font-bold text-foreground uppercase')}>
        LUNA
      </span>
    </Link>
  );
}
