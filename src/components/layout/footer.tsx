'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function Footer() {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');
  const isAccountPage = pathname.startsWith('/account');

  if (isAdminPage || isAccountPage) {
    return null;
  }

  return (
    <footer className="font-sans bg-background/80 backdrop-blur-sm border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            © 2026 Luna ECO System. All rights reserved.
          </p>
          <div className="flex space-x-4 text-xs">
            <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/support" className="text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
