import { Logo } from "./logo";
import { MainNav } from "./main-nav";
import { UserNav } from "./user-nav";
import { SearchBar } from "./search-bar";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        <div className="flex items-center gap-6 md:gap-10">
          <Logo />
          <MainNav />
        </div>

        <div className="flex-1 px-4">
          <div className="mx-auto w-full max-w-md">
            <SearchBar />
          </div>
        </div>

        <div className="flex items-center">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
