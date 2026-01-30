import Link from "next/link";
import { cn } from "@/lib/utils";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn("hidden md:flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      <Link
        href="/products/new"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        List an Item
      </Link>
      <Link
        href="/support"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Support
      </Link>
      <Link
        href="/admin"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Admin
      </Link>
    </nav>
  );
}
