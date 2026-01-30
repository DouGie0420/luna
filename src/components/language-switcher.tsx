'use client';

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/use-translation";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const { setLanguage } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="relative h-9 w-9 rounded-full p-0.5 bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate">
          <Button variant="ghost" size="icon" title="Change language" className="h-full w-full rounded-full bg-background hover:bg-transparent">
            <Languages className="h-5 w-5" />
            <span className="sr-only">Change language</span>
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setLanguage('en')}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLanguage('zh')}>
          中文
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLanguage('th')}>
          ไทย
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
