import { Moon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Luna Exchange Home">
      <Moon className="h-6 w-6 text-foreground" />
      <span className={cn('font-headline text-xl font-bold hidden sm:inline-block')}>
        Luna Exchange
      </span>
    </Link>
  );
}
