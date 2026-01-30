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
  color = 'hsl(var(--primary))',
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
    const startX = Math.floor(cols / 2);
    const startY = Math.floor(rows / 2);

    for(let i = 0; i < length; i++) {
        snake.push({x: startX - i, y: startY});
    }

    let direction = 'right'; // right, down, left, up
    let movesSinceTurn = 0;
    let movesUntilTurn = Math.floor(Math.random() * 15) + 10;

    const update = () => {
      let head = { ...snake[0] };
      const isAtTop = head.y <= 0;
      const isAtBottom = head.y >= rows - 1;
      const isAtLeft = head.x <= 0;
      const isAtRight = head.x >= cols - 1;

      // Change direction logic
      if (movesSinceTurn >= movesUntilTurn || 
          (isAtLeft && direction === 'left') ||
          (isAtRight && direction === 'right') ||
          (isAtTop && direction === 'up') ||
          (isAtBottom && direction === 'down')
      ) {
          const directions = ['up', 'down', 'left', 'right'];
          const oppositeDirections: {[key: string]: string} = {
              'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left',
          };
          let possibleDirections = directions.filter(d => d !== oppositeDirections[direction]);
          
          if(isAtLeft) possibleDirections = possibleDirections.filter(d => d !== 'left');
          if(isAtRight) possibleDirections = possibleDirections.filter(d => d !== 'right');
          if(isAtTop) possibleDirections = possibleDirections.filter(d => d !== 'up');
          if(isAtBottom) possibleDirections = possibleDirections.filter(d => d !== 'down');
          
          if (possibleDirections.length > 0) {
            direction = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
          }
          
          movesSinceTurn = 0;
          movesUntilTurn = Math.floor(Math.random() * 15) + 10;
      }

      switch (direction) {
        case 'right': head.x++; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'up': head.y--; break;
      }
      
      movesSinceTurn++;
      
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
