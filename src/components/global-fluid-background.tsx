'use client';

import { usePathname } from 'next/navigation';
import React, { useEffect, useState, useRef } from 'react';

export function GlobalFluidBackground() {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    // 🚀 保留 Ref 声明，防止 React 渲染时找不到引用而崩溃
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => { 
        setIsMounted(true); 
    }, []);

    // 🛑 核心修复：清空了所有 useEffect 里的 Canvas 计算逻辑，彻底解决卡顿和内存占用
    useEffect(() => {
        // 这里留空，不执行任何代码
    }, [isMounted]);

    // 严谨的挂载检查，防止 SSR 期间崩溃
    if (!isMounted || pathname?.includes('/products/rental')) return null;

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[#020203]" style={{ zIndex: -1 }}>
            
            {/* 🔳 1. 最底层：精密白色像素格 (25% 透明度) */}
            <div className="absolute inset-0 z-0" style={{
                backgroundImage: `
                    linear-gradient(rgba(255, 255, 255, 0.25) 1.2px, transparent 1.2px), 
                    linear-gradient(90deg, rgba(255, 255, 255, 0.25) 1.2px, transparent 1.2px)
                `,
                backgroundSize: '28px 28px',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,1) 100%)' 
            }} />

            {/* 🌊 2. 中间层：流体层 - 采用高性能 GPU 径向渐变 (Mesh Gradient) */}
            <div className="absolute inset-0 z-10 opacity-60 transform-gpu scale-125 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-[radial-gradient(circle_at_center,_rgba(255,0,255,0.4)_0%,_transparent_75%)] animate-fluid-morph-slow will-change-transform" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[80vw] h-[80vw] bg-[radial-gradient(circle_at_center,_rgba(0,255,255,0.5)_0%,_transparent_75%)] animate-fluid-morph-slower will-change-transform" style={{ animationDelay: '-12s' }} />
                <div className="absolute top-[20%] left-[30%] w-[50vw] h-[50vw] bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.3)_0%,_transparent_75%)] animate-fluid-morph-medium will-change-transform" style={{ animationDelay: '-5s' }} />
            </div>

            {/* 🐍 3. Canvas 节点保留但保持透明，防止逻辑崩溃 */}
            <canvas ref={canvasRef} className="absolute inset-0 z-20 opacity-0 pointer-events-none" />

            {/* 🔦 4. 顶层：沉浸式暗场遮罩 */}
            <div className="absolute inset-0 z-30 bg-gradient-to-t from-[#020203] via-transparent to-transparent opacity-80" />

            <style jsx>{`
                @keyframes fluid-morph {
                    0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
                    33% { transform: translate(4vw, -4vh) scale(1.05) rotate(2deg); }
                    66% { transform: translate(-3vw, 3vh) scale(0.95) rotate(-2deg); }
                }
                .animate-fluid-morph-slow { animation: fluid-morph 40s infinite ease-in-out; }
                .animate-fluid-morph-slower { animation: fluid-morph 60s infinite ease-in-out reverse; }
                .animate-fluid-morph-medium { animation: fluid-morph 50s infinite ease-in-out; }
            `}</style>
        </div>
    );
}