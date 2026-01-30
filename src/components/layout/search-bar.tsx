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
          <div className="group relative flex h-14 items-center border border-primary/30 bg-transparent text-lg animate-glow">
              <Input
                  ref={inputRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
                  placeholder={placeholder}
                  className="h-full w-full appearance-none rounded-none border-0 bg-transparent pl-6 pr-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
              />
              <Button onClick={() => handleSearch(searchTerm)} className="h-full shrink-0 rounded-none bg-primary px-8 text-lg text-primary-foreground hover:bg-primary/90">
                  <Search className="mr-2 h-6 w-6" />
                  搜索
              </Button>
              {isLoading && (
                  <Loader2 className="absolute right-[160px] top-1/2 h-6 w-6 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <ul className="py-2">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="cursor-pointer px-4 py-2 text-sm hover:bg-accent"
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
