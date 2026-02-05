'use client';

import { usePathname } from 'next/navigation';
import { Logo } from "./logo";
import Link from 'next/link';

export function Footer() {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');

  if (isAdminPage) {
    return null;
  }

  return (
    <footer className="bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between md:items-end">
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <Logo />
            <p className="mt-2 text-sm text-muted-foreground">
              © 2026 Luna ECO Stystem. All rights reserved.
            </p>
          </div>
          <div className="flex space-x-6 text-sm">
            <Link href="/terms" className="text-muted-foreground hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/support" className="text-muted-foreground hover:text-foreground">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
