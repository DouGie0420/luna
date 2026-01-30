'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const quotes = [
    "Somnia Permutata In Luna’s Chasm.",
    "Lacus Somniorum Sub Luna, Lunar Vale."
];

export function RotatingQuote() {
    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsFading(true);
            setTimeout(() => {
                setCurrentQuoteIndex((prevIndex) => (prevIndex + 1) % quotes.length);
                setIsFading(false);
            }, 500); // fade out duration
        }, 5000); // Change quote every 5 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="text-center p-4 my-2">
            <p className={cn(
                "font-headline text-base text-primary animate-glow [text-shadow:0_0_15px_hsl(var(--primary))]",
                "transition-opacity duration-500",
                isFading ? "opacity-0" : "opacity-100"
            )}>
                {quotes[currentQuoteIndex]}
            </p>
        </div>
    );
}
