import { Logo } from "./logo";
import { UserNav } from "./user-nav";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm border-border/40">
      <div className="container mx-auto flex h-20 items-center justify-between gap-8 px-4">
        <Logo />

        <div className="flex items-center gap-4">
          <UserNav />
           <Button asChild variant="default" className="rounded-none">
              <Link href="/products/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                发布
              </Link>
           </Button>
        </div>
      </div>
    </header>
  );
}
