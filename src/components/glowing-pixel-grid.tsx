'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface GlowingPixelGridProps {
  className?: string;
  pixelSize?: number;
  glowChance?: number;
  glowDuration?: number;
}

interface Pixel {
  x: number;
  y: number;
  isGlowing: boolean;
  glowIntensity: number;
  glowTime: number;
}

export const GlowingPixelGrid: React.FC<GlowingPixelGridProps> = ({
  className,
  pixelSize = 20,
  glowChance = 0.03,
  glowDuration = 2500,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const pixels = useRef<Pixel[]>([]);
  // Use static theme values to avoid performance issues
  const baseColor = 'hsl(284 20% 25% / 0.5)'; // --border with alpha
  const glowColor = '310 100% 60%'; // --primary HSL values

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let lastTime = 0;
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
      
      pixels.current = [];
      const cols = Math.floor(canvas.width / pixelSize);
      const rows = Math.floor(canvas.height / pixelSize);

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          pixels.current.push({
            x,
            y,
            isGlowing: false,
            glowIntensity: 0,
            glowTime: Math.random() * glowDuration, // Start at random points in cycle
          });
        }
      }
    };
    
    resizeCanvas();

    const animate = (time: number) => {
      if (!lastTime) lastTime = time;
      const deltaTime = time - lastTime;
      lastTime = time;

      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pixels.current.forEach(pixel => {
        // Handle glowing logic
        if (pixel.isGlowing) {
          pixel.glowTime += deltaTime;
          const progress = pixel.glowTime / glowDuration;
          
          if (progress >= 1) {
            pixel.isGlowing = false;
            pixel.glowIntensity = 0;
            pixel.glowTime = 0;
          } else {
            pixel.glowIntensity = Math.sin(progress * Math.PI) * 0.7 + 0.1; // Sine wave from 0.1 to 0.8
          }
        } else if (Math.random() < glowChance / 60) { // Adjust chance based on framerate
          pixel.isGlowing = true;
          pixel.glowTime = 0;
        }

        // Draw base grid pixel
        ctx.fillStyle = baseColor;
        ctx.fillRect(pixel.x * pixelSize, pixel.y * pixelSize, pixelSize - 2, pixelSize - 2);
        
        // Draw glow overlay
        if (pixel.isGlowing) {
            ctx.fillStyle = `hsla(${glowColor}, ${pixel.glowIntensity})`;
            ctx.fillRect(pixel.x * pixelSize, pixel.y * pixelSize, pixelSize - 2, pixelSize - 2);
        }
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
  }, [pixelSize, glowChance, glowDuration, baseColor, glowColor]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'absolute inset-0 w-full h-full pointer-events-none z-0',
        className
      )}
    />
  );
};
