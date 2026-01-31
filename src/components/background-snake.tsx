'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface BackgroundSnakeProps {
  className?: string;
  pixelSize?: number;
  speed?: number;
  color?: string;
  length?: number;
}

export const BackgroundSnake: React.FC<BackgroundSnakeProps> = ({
  className,
  pixelSize = 20, // larger pixels for the background snake
  speed = 100, // slower speed
  color = 'hsl(284 20% 90%)',
  length = 30,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();

    const cols = Math.floor(canvas.width / pixelSize);
    const rows = Math.floor(canvas.height / pixelSize);

    let snake: {x: number, y: number}[] = [];
    
    for(let i = 0; i < length; i++) {
        snake.push({x: 0 - i, y: 0});
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
      ctx.fillStyle = color;
      snake.forEach((segment, index) => {
        const opacity = Math.max(0, 1 - (index / snake.length));
        ctx.globalAlpha = opacity;
        ctx.fillRect(segment.x * pixelSize, segment.y * pixelSize, pixelSize, pixelSize);
      });
      ctx.globalAlpha = 1.0;
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
    window.addEventListener('resize', resizeCanvas);

    return () => {
        if(animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
        window.removeEventListener('resize', resizeCanvas);
    };
  }, [pixelSize, speed, color, length]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'fixed inset-0 w-full h-full pointer-events-none z-[-1]',
        className
      )}
    />
  );
};
