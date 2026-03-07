'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const quotes = [
    "Somnia Permutata In Luna’s Chasm.",
    "Lacus Somniorum Sub Luna, Lunar Vale."
];

export function RotatingQuote() {
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [text, setText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    
    const typingSpeed = 120;
    const deletingSpeed = 70;
    const pauseDuration = 2000;

    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (isDeleting) {
            // Handle deleting
            if (text.length > 0) {
                timer = setTimeout(() => {
                    setText((prev) => prev.slice(0, -1));
                }, deletingSpeed);
            } else {
                // Finished deleting, switch to next quote
                setIsDeleting(false);
                setQuoteIndex((prev) => (prev + 1) % quotes.length);
            }
        } else {
            // Handle typing
            const fullQuote = quotes[quoteIndex];
            if (text.length < fullQuote.length) {
                timer = setTimeout(() => {
                    setText((prev) => fullQuote.substring(0, prev.length + 1));
                }, typingSpeed);
            } else {
                // Pause at the end of the line before deleting
                timer = setTimeout(() => setIsDeleting(true), pauseDuration);
            }
        }

        return () => clearTimeout(timer);
    }, [text, isDeleting, quoteIndex]);

    return (
        <div className="text-center py-4">
            <p className={cn(
                "font-headline text-sm text-muted-foreground animate-glow-muted h-4 flex justify-center items-center",
            )}>
                <span>{text}</span>
                <span className="inline-block w-px h-4 bg-muted-foreground ml-1 animate-pulse"></span>
            </p>
        </div>
    );
}
