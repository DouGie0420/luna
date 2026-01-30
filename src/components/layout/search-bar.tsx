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
            <div className="relative flex items-center">
                <Input
                    ref={inputRef}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
                    placeholder="搜点什么"
                    className="w-full h-14 text-lg rounded-lg rounded-r-none border-2 border-r-0 border-primary/50 bg-card/50 focus-visible:ring-primary focus-visible:border-primary"
                />
                 <Button onClick={() => handleSearch(searchTerm)} className="h-14 px-6 rounded-lg rounded-l-none bg-secondary hover:bg-secondary/90 text-secondary-foreground text-lg">
                    <Search className="h-5 w-5 mr-2" />
                    搜索
                </Button>
                {isLoading && (
                    <Loader2 className="absolute right-[120px] top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
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
