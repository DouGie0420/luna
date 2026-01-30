import { Logo } from "./logo";
import { UserNav } from "./user-nav";
import { AnnouncementBar } from "./announcement-bar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { GlowingPixelGrid } from "../glowing-pixel-grid";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full bg-background relative">
      <GlowingPixelGrid className="-z-10" />
      <div className="container mx-auto flex h-20 items-center justify-between gap-8 px-4">
        <Logo />

        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
          <AnnouncementBar />
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
