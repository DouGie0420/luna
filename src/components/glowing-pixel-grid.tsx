
'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Star properties interface
interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  fadingIn: boolean;
  fadeSpeed: number;
}

// Simple hash to create a seed from a string (like a user's UID)
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Pseudo-random number generator for deterministic patterns
function mulberry32(seed: number) {
    return function() {
      var t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}


interface GlowingPixelGridProps {
  className?: string;
  seed: string;
}

export const GlowingPixelGrid: React.FC<GlowingPixelGridProps> = ({ className, seed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const starsRef = useRef<Star[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const parent = canvas.parentElement;
    if(!parent) return;
    
    const resizeCanvas = () => {
        if (!parent) return;
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
        
        const numStars = 100;
        const seedHash = simpleHash(seed || 'default-seed');
        const random = mulberry32(seedHash);
        
        starsRef.current = [];
        for (let i = 0; i < numStars; i++) {
            starsRef.current.push({
                x: random() * canvas.width,
                y: random() * canvas.height,
                radius: random() * 1.2,
                opacity: random() * 0.5 + 0.2,
                fadingIn: random() > 0.5,
                fadeSpeed: random() * 0.01 + 0.005,
            });
        }
    };
    
    const draw = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        starsRef.current.forEach(star => {
            if (star.fadingIn) {
                star.opacity += star.fadeSpeed;
                if (star.opacity > 0.7) {
                    star.opacity = 0.7;
                    star.fadingIn = false;
                }
            } else {
                star.opacity -= star.fadeSpeed;
                if (star.opacity < 0.2) {
                    star.opacity = 0.2;
                    star.fadingIn = true;
                }
            }

            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(229, 225, 230, ${star.opacity})`; // HSL(284 20% 90%)
            ctx.fill();
        });
    };

    const animate = () => {
      draw();
      animationFrameId.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();
    
    const resizeObserver = new ResizeObserver(resizeCanvas);
    if (parent) {
      resizeObserver.observe(parent);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
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
