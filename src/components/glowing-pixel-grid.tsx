'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface GlowingPixelGridProps {
  className?: string;
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
}

export const GlowingPixelGrid: React.FC<GlowingPixelGridProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const stars = useRef<Star[]>([]);
  const foregroundColor = '226, 219, 230'; // Hardcoded from hsl(284 20% 90%)

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resizeCanvas = () => {
        const parent = canvas.parentElement;
        if (!parent) return;
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
        
        stars.current = [];
        const starCount = Math.floor(canvas.width * canvas.height / 2000); // Adjust density

        for (let i = 0; i < starCount; i++) {
          stars.current.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1, // Size between 1 and 3
            opacity: Math.random(),
            speed: Math.random() * 0.05 + 0.01,
          });
        }
    };
    
    resizeCanvas();

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.current.forEach(star => {
        // Update opacity for twinkling effect
        star.opacity += star.speed;
        if (star.opacity > 1 || star.opacity < 0) {
            star.speed *= -1;
        }

        ctx.fillStyle = `rgba(${foregroundColor}, ${star.opacity})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);
    
    const parent = canvas.parentElement;
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
  }, [foregroundColor]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'absolute inset-0 w-full h-full pointer-events-none', // z-index will be handled by parent
        className
      )}
    />
  );
};
