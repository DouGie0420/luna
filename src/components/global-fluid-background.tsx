'use client';

import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

export function GlobalFluidBackground() {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // 🛑 路由嗅探器：如果是 SANCTUM 房源相关页面，休眠引擎
    // 同时也防止服务端渲染时的闪烁
    if (!isMounted || pathname?.includes('/products/rental')) {
        return null;
    }

    return (
        // 🚀 外层容器：沉入最底层 (z-index: -50)，设置深色背景基调
        <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[#030305]" style={{ zIndex: -50 }}>

            {/* 🌊 流体特效容器：应用 SVG Gooey 滤镜的核心区域 */}
            {/* mix-blend-screen 让光斑更亮，opacity 控制整体强度 */}
            <div className="absolute inset-0 filter-[url(#goo)] opacity-60 mix-blend-screen transform-gpu">
                
                {/* 这里的几个 div 是流动的色块来源。
                    关键点：我们不仅移动它们的位置，还动态改变它们的 border-radius (圆角)，让它们看起来在不断变形。
                */}

                {/* 紫色主能量流 */}
                <div className="absolute top-[10%] left-[15%] w-[45vw] h-[45vw] bg-purple-700/50 rounded-full animate-fluid-morph-slow will-change-transform" style={{ animationDelay: '0s' }} />
                
                {/* 蓝色深渊流 */}
                <div className="absolute bottom-[20%] right-[10%] w-[55vw] h-[55vw] bg-blue-800/40 rounded-full animate-fluid-morph-slower will-change-transform" style={{ animationDelay: '-15s' }} />
                
                {/* 粉色活跃流 */}
                <div className="absolute top-[40%] right-[30%] w-[35vw] h-[35vw] bg-pink-700/30 rounded-full animate-fluid-morph-medium will-change-transform" style={{ animationDelay: '-7s' }} />
                
                 {/* 青色补充流 - 增加色彩丰富度 */}
                <div className="absolute -bottom-[10%] -left-[10%] w-[50vw] h-[50vw] bg-cyan-800/30 rounded-full animate-fluid-morph-slow will-change-transform" style={{ animationDelay: '-25s', animationDuration: '60s' }} />
            </div>

            {/* 🔮 SVG 滤镜定义 (隐藏在 DOM 中) - 这是实现液体融合魔术的核心 */}
            {/* 警告：不要随意修改矩阵参数，这是调出来的最佳粘稠度 */}
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" className="hidden">
                <defs>
                    <filter id="goo">
                        {/* 1. 高斯模糊：极大程度地把所有色块糊在一起，stdDeviation 控制模糊程度 */}
                        <feGaussianBlur in="SourceGraphic" stdDeviation="60" result="blur" />
                        {/* 2. 颜色矩阵：提高对比度，把模糊的边缘重新变锋利，形成液体的张力感 */}
                        {/* 最后一行两个数是关键：放大 alpha 通道然后减去一个阈值 */}
                        <feColorMatrix in="blur" mode="matrix" values="
                            1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 30 -12" result="goo" />
                        <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
                    </filter>
                </defs>
            </svg>

            <style jsx>{`
                /* 定义极其缓慢、复杂的变形动画 
                   不仅改变位置 (translate)，还改变形状 (border-radius) 和角度 (rotate)
                */
                @keyframes fluid-morph {
                    0%, 100% { 
                        transform: translate(0, 0) scale(1) rotate(0deg); 
                        border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; 
                    }
                    25% { 
                        transform: translate(8vw, -10vh) scale(1.1) rotate(45deg); 
                        border-radius: 40% 60% 70% 30% / 50% 60% 30% 60%; 
                    }
                    50% { 
                        transform: translate(15vw, 5vh) scale(0.9) rotate(90deg); 
                        border-radius: 70% 30% 50% 50% / 30% 50% 60% 40%; 
                    }
                    75% { 
                        transform: translate(-5vw, 15vh) scale(1.05) rotate(135deg); 
                        border-radius: 30% 70% 60% 40% / 60% 40% 50% 50%; 
                    }
                }

                /* 应用不同时长和方向的动画，制造混沌感 */
                .animate-fluid-morph-slow {
                    animation: fluid-morph 40s infinite alternate ease-in-out;
                }
                .animate-fluid-morph-slower {
                    animation: fluid-morph 60s infinite alternate-reverse ease-in-out;
                }
                .animate-fluid-morph-medium {
                    animation: fluid-morph 30s infinite reverse ease-in-out;
                }
            `}</style>
        </div>
    );
}