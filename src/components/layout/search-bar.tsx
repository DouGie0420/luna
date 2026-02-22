'use client';

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
import { smartSearchSuggestions } from '@/ai/flows/smart-search-suggestions';
import { useDebounce } from '@/hooks/use-debounce';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholderKeywords?: string[];
}

export function SearchBar({ placeholderKeywords = [] }: SearchBarProps) {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [placeholder, setPlaceholder] = useState('搜点什么');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('searchHistory');
      if (storedHistory) {
        setSearchHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to parse search history from localStorage", e);
      localStorage.removeItem('searchHistory');
    }
  }, []);

  const addToHistory = (term: string) => {
    const updatedHistory = [term, ...searchHistory.filter(t => t.toLowerCase() !== term.toLowerCase())].slice(0, 5);
    setSearchHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
  };


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

  useEffect(() => {
    if (debouncedSearchTerm.length > 1) {
      const fetchSuggestions = async () => {
        setIsLoading(true);
        setSuggestions([]); // Clear old suggestions
        try {
          const result = await smartSearchSuggestions({
            searchTerm: debouncedSearchTerm,
            searchHistory: searchHistory,
          });
          
          if (result.suggestions && result.suggestions.length > 0) {
            setSuggestions(result.suggestions);
            setIsPopoverOpen(true);
          } else {
            setSuggestions([]); // Ensure it's an empty array for the "No suggestions" message
            setIsPopoverOpen(true); // Still open to show the message
          }
        } catch (error) {
          console.error('Failed to fetch search suggestions:', error);
          setSuggestions([]);
          setIsPopoverOpen(false);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSuggestions();
    } else {
      setSuggestions([]);
      setIsPopoverOpen(false);
    }
  }, [debouncedSearchTerm, searchHistory]);


  const handleSearch = (term: string) => {
    if (!term) return;
    const trimmedTerm = term.trim();
    if (!trimmedTerm) return;
    
    setSearchTerm(trimmedTerm);
    addToHistory(trimmedTerm);
    setSuggestions([]);
    setIsPopoverOpen(false);
    inputRef.current?.blur();
    router.push(`/search?q=${encodeURIComponent(trimmedTerm)}`);
  };

  return (
    <div className="relative w-full">
       <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <div
            className="group relative flex h-16 items-center rounded-full border bg-transparent text-xl overflow-hidden animate-glow-border-primary"
            >
              {user && (
                <Button asChild className="h-full shrink-0 rounded-none bg-primary px-10 text-xl text-primary-foreground hover:bg-primary/90">
                  <Link href="/nearby">
                    Nearby
                  </Link>
                </Button>
              )}
              <div className="relative flex-grow h-full" onClick={() => {
                if (suggestions.length > 0 || (searchTerm.length > 1 && !isLoading)) setIsPopoverOpen(true)
              }}>
                {!user && <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground pointer-events-none" />}
                <Input
                    ref={inputRef}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
                    placeholder={placeholder}
                    className={cn(
                      "h-full w-full appearance-none rounded-none border-0 bg-transparent pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0",
                      user ? "pl-4" : "pl-12"
                    )}
                />
              </div>
              <Button onClick={() => handleSearch(searchTerm)} className="h-full shrink-0 rounded-none bg-primary px-10 text-xl text-primary-foreground hover:bg-primary/90">
                  <Search className="mr-2 h-5 w-5" />
                  搜索
              </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 border-primary/50 bg-background/80 backdrop-blur-sm"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在生成建议...
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="py-2">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="cursor-pointer px-4 py-2 text-sm hover:bg-accent opacity-0"
                  style={{ animation: `suggestion-fade-in 0.3s ease-out ${index * 0.07}s forwards` }}
                  onMouseDown={(e) => { 
                    e.preventDefault();
                    handleSearch(suggestion);
                  }}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          ) : (
             <div className="p-4 text-center text-sm text-muted-foreground">
                没有找到相关建议
             </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
