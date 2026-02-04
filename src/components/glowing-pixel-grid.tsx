'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

// A simple pseudo-random number generator function to create deterministic patterns
function mulberry32(seed: number) {
    return function() {
      var t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Function to create a simple hash from a string (like a user's UID)
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

interface GlowingPixelGridProps {
  className?: string;
  seed: string; // The user's UID to make the pattern unique
}

export const GlowingPixelGrid: React.FC<GlowingPixelGridProps> = ({ className, seed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Fix: Add guard clause to prevent error if seed is not yet available.
    if (!seed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const parent = canvas.parentElement;
    if(!parent) return;

    const drawPattern = () => {
        if (!ctx) return;
        
        // Ensure canvas dimensions are set before drawing
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;

        // New: Expanded, colorful palette for a vibrant cyberpunk feel.
        const colors = [
            'hsl(var(--primary) / 0.8)', // Bright Pink
            'hsl(180 100% 50% / 0.7)',    // Cyan
            'hsl(84 78% 55% / 0.8)',     // Lime Green
            'hsl(50 100% 60% / 0.7)',    // Bright Yellow
            'hsl(var(--foreground) / 0.5)',
            'hsl(var(--accent))',
        ];

        // Use the seed to create a deterministic random generator
        const seedHash = simpleHash(seed);
        const random = mulberry32(seedHash);

        const gridSize = 8; // Generate an 8x8 grid of "macro-pixels"
        const cellWidth = Math.ceil(canvas.width / gridSize);
        const cellHeight = Math.ceil(canvas.height / gridSize);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Ensure pixelated rendering
        ctx.imageSmoothingEnabled = false;

        for (let y = 0; y < gridSize; y++) {
            // Loop to the middle for horizontal symmetry, a common pixel art technique
            for (let x = 0; x < Math.ceil(gridSize / 2); x++) { 
                // 50% chance to draw a pixel
                if (random() > 0.5) { 
                    const colorIndex = Math.floor(random() * colors.length);
                    ctx.fillStyle = colors[colorIndex];
                    
                    // Draw original pixel
                    ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                    
                    // Draw mirrored pixel on the other side
                    const mirrorX = (gridSize - 1 - x) * cellWidth;
                    ctx.fillRect(mirrorX, y * cellHeight, cellWidth, cellHeight);
                }
            }
        }
    }
    
    // Draw on mount and whenever the container resizes
    const resizeObserver = new ResizeObserver(drawPattern);
    if (parent) {
      resizeObserver.observe(parent);
    }

    return () => {
      if (parent) {
        resizeObserver.unobserve(parent);
      }
    };
  }, [seed]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'absolute inset-0 w-full h-full pointer-events-none',
        className
      )}
    />
  );
};

    