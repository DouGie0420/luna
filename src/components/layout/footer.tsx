'use client';

import { usePathname } from 'next/navigation';
import { Logo } from "./logo";

export function Footer() {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');

  if (isAdminPage) {
    return null;
  }

  return (
    <footer className="bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Logo />
            <p className="mt-2 text-sm text-muted-foreground">
              © {new Date().getFullYear()} Luna Exchange. All rights reserved.
            </p>
          </div>
          <div className="flex space-x-6 text-sm">
            <a href="#" className="text-muted-foreground hover:text-foreground">
              Terms of Service
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground">
              Privacy Policy
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
