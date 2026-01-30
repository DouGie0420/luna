'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SnakeBorderProps {
  className?: string;
  pixelSize?: number;
  speed?: number; // Time in ms between frames
  color?: string;
  length?: number;
}

export const SnakeBorder: React.FC<SnakeBorderProps> = ({
  className,
  pixelSize = 4,
  speed = 40,
  color = 'hsl(var(--primary))',
  length = 20,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const parent = canvas.parentElement;
    if(!parent) return;

    const resizeCanvas = () => {
        if (parent) {
            canvas.width = parent.offsetWidth;
            canvas.height = parent.offsetHeight;
        }
    };
    
    resizeCanvas();

    const cols = Math.floor(canvas.width / pixelSize);
    const rows = Math.floor(canvas.height / pixelSize);

    let snake: {x: number, y: number}[] = [];
    for(let i = 0; i < length; i++) {
        snake.push({x: Math.floor(cols / 4) - i, y: 0});
    }

    let direction = 'right'; // right, down, left, up

    const update = () => {
      let head = { ...snake[0] };

      switch (direction) {
        case 'right':
          head.x++;
          if (head.x >= cols - 1) {
            head.x = cols - 1;
            direction = 'down';
          }
          break;
        case 'down':
          head.y++;
          if (head.y >= rows - 1) {
            head.y = rows - 1;
            direction = 'left';
          }
          break;
        case 'left':
          head.x--;
          if (head.x <= 0) {
            head.x = 0;
            direction = 'up';
          }
          break;
        case 'up':
          head.y--;
          if (head.y <= 0) {
            head.y = 0;
            direction = 'right';
          }
          break;
      }
      
      snake.pop();
      snake.unshift(head);
    };

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Add glow effect
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;

      ctx.fillStyle = color;
      snake.forEach((segment, index) => {
        // Create a tail that fades out
        const opacity = Math.max(0, 1 - (index / snake.length));
        ctx.globalAlpha = opacity;
        ctx.fillRect(segment.x * pixelSize, segment.y * pixelSize, pixelSize, pixelSize);
      });
      ctx.globalAlpha = 1.0;
      
      // Reset shadow
      ctx.shadowBlur = 0;
    };

    let lastTime = 0;
    const animate = (time: number) => {
      if (time - lastTime > speed) {
        update();
        draw();
        lastTime = time;
      }
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);
    const resizeObserver = new ResizeObserver(resizeCanvas);
    if (parent) {
      resizeObserver.observe(parent);
    }

    return () => {
        if(animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
        if (parent) {
          resizeObserver.unobserve(parent);
        }
    };
  }, [pixelSize, speed, color, length]);

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
