"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDebounce } from '@/hooks/use-debounce';
import { SnakeBorder } from '@/components/snake-border';

interface SearchBarProps {
  placeholderKeywords?: string[];
}

export function SearchBar({ placeholderKeywords = [] }: SearchBarProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [placeholder, setPlaceholder] = useState('搜点什么');

  useEffect(() => {
    if (placeholderKeywords && placeholderKeywords.length > 0) {
      setPlaceholder(placeholderKeywords[0]);
      let currentIndex = 0;
      const interval = setInterval(() => {
        currentIndex = (currentIndex + 1) % placeholderKeywords.length;
        setPlaceholder(placeholderKeywords[currentIndex]);
      }, 2000); // Change keyword every 2 seconds

      return () => clearInterval(interval);
    }
  }, [placeholderKeywords]);

  const handleSearch = (term: string) => {
    if (!term) return;
    const trimmedTerm = term.trim();
    if (!trimmedTerm) return;
    
    setSearchTerm(trimmedTerm);
    setSuggestions([]);
    setIsPopoverOpen(false);
    inputRef.current?.blur();
    router.push(`/search?q=${encodeURIComponent(trimmedTerm)}`);
  };

  return (
    <div className="relative w-full">
       <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
            <div className="relative">
                <div className="relative flex items-center rounded-none overflow-hidden border-2 border-primary/50 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ring-offset-background transition-shadow">
                    <Input
                        ref={inputRef}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
                        placeholder={placeholder}
                        className="w-full h-12 text-base pl-6 bg-card/50 border-0 rounded-none focus-visible:ring-0 focus-visible:outline-none placeholder:text-muted-foreground"
                    />
                    <Button onClick={() => handleSearch(searchTerm)} className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground text-base shrink-0">
                        <Search className="h-5 w-5 mr-2" />
                        搜索
                    </Button>
                    {isLoading && (
                        <Loader2 className="absolute right-[150px] top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground animate-spin" />
                    )}
                </div>
                <SnakeBorder color="hsl(120 100% 50%)" />
            </div>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <ul className="py-2">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="px-4 py-2 text-sm hover:bg-accent cursor-pointer"
                onClick={() => handleSearch(suggestion)}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
