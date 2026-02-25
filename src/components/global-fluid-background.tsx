'use client';

import { usePathname } from 'next/navigation';
import React, { useEffect, useState, useRef } from 'react';

export function GlobalFluidBackground() {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => { setIsMounted(true); }, []);

    // 🐍 边缘巡逻像素蛇引擎 (低功耗，保持不变)
    useEffect(() => {
        if (!isMounted) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);
        let snakeLength = 20;
        let snakeNodes = Array.from({length: snakeLength}, () => ({x: -100, y: -100}));
        let progress = 0;
        const speed = 2.0; 

        const animate = () => {
            const perimeter = (width + height) * 2;
            progress = (progress + speed) % perimeter;
            let curX = 0, curY = 0;
            const offset = 4;

            if (progress < width) { curX = progress; curY = offset; }
            else if (progress < width + height) { curX = width - offset; curY = progress - width; }
            else if (progress < 2 * width + height) { curX = width - (progress - (width + height)); curY = height - offset; }
            else { curX = offset; curY = height - (progress - (2 * width + height)); }

            ctx.clearRect(0, 0, width, height);
            snakeNodes.unshift({x: curX, y: curY});
            if (snakeNodes.length > snakeLength) snakeNodes.pop();

            snakeNodes.forEach((p, i) => {
                const alpha = (1 - i / snakeLength) * 0.15; 
                ctx.fillStyle = `rgba(168, 85, 247, ${alpha})`;
                ctx.fillRect(p.x - 6, p.y - 6, 12, 12);
            });
            requestAnimationFrame(animate);
        };

        animate();
        const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMounted]);

    if (!isMounted || pathname?.includes('/products/rental')) return null;

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[#020203]" style={{ zIndex: -50 }}>
            
            {/* 🔳 1. 最底层：精密白色像素格基底 (Pixel Grid Base) - z-0 */}
            <div className="absolute inset-0 z-0" style={{
                backgroundImage: `
                    linear-gradient(rgba(255, 255, 255, 0.25) 1.2px, transparent 1.2px), 
                    linear-gradient(90deg, rgba(255, 255, 255, 0.25) 1.2px, transparent 1.2px)
                `,
                backgroundSize: '28px 28px',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.9) 100%)' 
            }} />

            {/* 🌊 2. 中间层：全屏灵动流体 (Fluid Overlay) - z-10 */}
            {/* 🚀 性能优化核心：彻底抛弃高耗能 SVG 滤镜，改用 CSS GPU 硬件加速的极致模糊 (Mesh Gradient) */}
            <div className="absolute inset-0 z-10 opacity-50 transform-gpu scale-110 pointer-events-none">
                {/* --- 侧翼流体 --- */}
                <div className="absolute top-[-10%] left-[-20%] w-[55vw] h-[55vw] bg-purple-900/50 rounded-full blur-[100px] animate-fluid-morph-slow will-change-transform" />
                <div className="absolute bottom-[-10%] right-[-20%] w-[60vw] h-[60vw] bg-blue-900/40 rounded-full blur-[120px] animate-fluid-morph-slower will-change-transform" style={{ animationDelay: '-12s' }} />
                
                {/* --- 中央核心流体 --- */}
                <div className="absolute top-[25%] left-[35%] w-[40vw] h-[40vw] bg-purple-800/30 rounded-full blur-[90px] animate-fluid-morph-medium will-change-transform" style={{ animationDelay: '-5s' }} />
                <div className="absolute bottom-[30%] right-[40%] w-[35vw] h-[35vw] bg-pink-800/25 rounded-full blur-[100px] animate-fluid-morph-slow will-change-transform" style={{ animationDelay: '-18s' }} />
            </div>

            {/* 🐍 3. 上层：边缘巡逻蛇 - z-20 */}
            <canvas ref={canvasRef} className="absolute inset-0 z-20" />

            {/* 🔦 4. 顶层：底部沉浸式暗场遮罩 - z-30 */}
            <div className="absolute inset-0 z-30 bg-gradient-to-t from-[#020203] via-transparent to-transparent opacity-70" />

            {/* 🚀 SVG 滤镜节点已被安全切除，释放大量 GPU 资源 */}

            <style jsx>{`
                @keyframes fluid-morph {
                    0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                    33% { transform: translate(5vw, -5vh) rotate(120deg) scale(1.1); border-radius: 40% 60% 70% 30% / 50% 60% 30% 60%; }
                    66% { transform: translate(-5vw, 5vh) rotate(240deg) scale(0.9); border-radius: 30% 70% 60% 40% / 60% 40% 50% 50%; }
                }
                .animate-fluid-morph-slow { animation: fluid-morph 60s infinite linear; }
                .animate-fluid-morph-slower { animation: fluid-morph 90s infinite linear reverse; }
                .animate-fluid-morph-medium { animation: fluid-morph 50s infinite linear; }
            `}</style>
        </div>
    );
}