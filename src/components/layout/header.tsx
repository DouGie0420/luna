import { Logo } from "./logo";
import { UserNav } from "./user-nav";
import { SearchBar } from "./search-bar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export function Header() {
  const hotSearches = ["热水袋", "羽绒服", "电动车", "男童羽绒服", "巧克力", "手机壳", "女衣", "牛仔裤"];
  
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-primary border-primary/20">
      <div className="container mx-auto flex h-24 items-center justify-between gap-8 px-4">
        <div className="flex items-center self-start pt-6">
          <Logo />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <div className="w-full max-w-xl">
            <SearchBar />
          </div>
          <div className="flex gap-x-3">
            {hotSearches.map(item => (
               <Link href={`/search?q=${item}`} key={item} className="text-xs text-primary-foreground/70 hover:text-primary-foreground">
                {item}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 self-start pt-6">
          <UserNav />
           <Button variant="secondary" className="rounded-full">
              <PlusCircle className="mr-2 h-4 w-4" />
              发布
           </Button>
        </div>
      </div>
    </header>
  );
}
