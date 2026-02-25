'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function PageHeaderWithBackAndClose() {
    const router = useRouter();
    const pathname = usePathname();

    // 🚀 核心回退逻辑：返回当前界面的上一级目录 (例如 /bbs/[id] -> /bbs)
    const handleBack = () => {
        if (!pathname) return router.back();
        
        const pathSegments = pathname.split('/').filter(Boolean);
        if (pathSegments.length > 1) {
            // 剥离最后一段路径，实现逻辑级后退
            const parentPath = '/' + pathSegments.slice(0, -1).join('/');
            router.push(parentPath);
        } else {
            // 如果已经在第一级目录，则直接回首页
            router.push('/');
        }
    };

    return (
        /* 🚀 容器透明，fixed 定位紧跟红色导航栏 */
        <div className="fixed top-20 left-0 w-full z-[100] pointer-events-none">
            <div className="flex items-center justify-between px-6 md:px-10 py-4 w-full">
                
                {/* ⬅️ 左侧：统一 UI 的 BACK 按钮 */}
                <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="pointer-events-auto"
                >
                    <div className="group relative">
                        {/* 呼吸发光底影 */}
                        <div className="absolute -inset-2 bg-lime-400/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Button 
                            onClick={handleBack}
                            variant="ghost" 
                            className="relative bg-black/40 backdrop-blur-xl border border-white/10 group-hover:border-lime-400/50 text-lime-400 rounded-full px-5 py-2 h-10 flex items-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all active:scale-95"
                        >
                            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            {/* 去掉 italic，保持 font-black 的硬朗感 */}
                            <span className="text-xs font-black uppercase tracking-tighter">BACK</span>
                        </Button>
                    </div>
                </motion.div>

                {/* 🏠 右侧：统一 UI 的 HOME 按钮 */}
                <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="pointer-events-auto"
                >
                    <Link href="/">
                        <div className="group relative">
                            <div className="absolute -inset-2 bg-lime-400/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 group-hover:border-lime-400/50 text-lime-400 rounded-full px-5 py-2 h-10 flex items-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all active:scale-95">
                                <X className="h-4 w-4 group-hover:rotate-90 transition-transform duration-500" />
                                <span className="text-xs font-black uppercase tracking-tighter">HOME</span>
                            </div>
                        </div>
                    </Link>
                </motion.div>

            </div>
        </div>
    );
}