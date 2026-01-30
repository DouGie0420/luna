"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { smartSearchSuggestions } from '@/ai/flows/smart-search-suggestions';
import { useDebounce } from '@/hooks/use-debounce';

export function SearchBar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSuggestions([]);
      setIsPopoverOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await smartSearchSuggestions({
        searchTerm: term,
        searchHistory: searchHistory,
      });
      setSuggestions(result.suggestions);
      if (result.suggestions.length > 0) {
        setIsPopoverOpen(true);
      } else {
        setIsPopoverOpen(false);
      }
    } catch (error) {
      console.error('Error fetching search suggestions:', error);
      setSuggestions([]);
      setIsPopoverOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [searchHistory]);

  useEffect(() => {
    if (debouncedSearchTerm) {
      fetchSuggestions(debouncedSearchTerm);
    } else {
      setSuggestions([]);
      setIsPopoverOpen(false);
    }
  }, [debouncedSearchTerm, fetchSuggestions]);

  const handleSearch = (term: string) => {
    if (!term) return;
    setSearchTerm(term);
    setSearchHistory(prev => [term, ...prev.slice(0, 4)]);
    setSuggestions([]);
    setIsPopoverOpen(false);
    // Here you would typically navigate to the search results page
    console.log(`Searching for: ${term}`);
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full">
       <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
            <div className="relative flex items-center rounded-none overflow-hidden border-2 border-primary/50 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ring-offset-background transition-shadow">
                <Input
                    ref={inputRef}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
                    placeholder="搜点什么"
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
