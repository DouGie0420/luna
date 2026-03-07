'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';
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
        /* 🚀 容器透明，fixed 定位精准下移 (top-[90px] / md:top-[110px])，完美避开任何全局顶栏 */
        <div className="fixed top-[90px] md:top-[110px] left-0 w-full px-4 md:px-10 flex items-center justify-between z-[90] pointer-events-none">
            
            {/* 👈 BACK: BBS 级增强亮度与阻尼动画 */}
            <motion.button 
                onClick={handleBack}
                whileHover="hover" initial="initial"
                className="flex-shrink-0 flex items-center gap-4 group cursor-pointer pointer-events-auto"
            >
                <div className="relative">
                    <motion.div 
                        variants={{ hover: { scale: 1.8, opacity: 0.9 }, initial: { scale: 1.2, opacity: 0.3 } }}
                        className="absolute -inset-2 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 rounded-full blur-2xl transition-all duration-700"
                    />
                    <div className="relative z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#050508]/80 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)] group-hover:border-purple-400 group-hover:bg-black transition-colors duration-300">
                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-white/70 group-hover:text-white transition-colors" />
                    </div>
                </div>
                <span className="hidden lg:block text-[10px] font-mono font-black italic uppercase tracking-[0.4em] text-white/50 group-hover:text-purple-300 transition-all drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
                    [ BACK ]
                </span>
            </motion.button>

            {/* 👉 HOME: BBS 级增强亮度与阻尼动画 */}
            <Link href="/" className="flex-shrink-0 flex flex-row-reverse items-center gap-4 group cursor-pointer pointer-events-auto">
                <motion.div whileHover="hover" initial="initial" className="flex flex-row-reverse items-center gap-4">
                    <div className="relative">
                        <motion.div 
                            variants={{ hover: { scale: 1.8, opacity: 0.9 }, initial: { scale: 1.2, opacity: 0.3 } }}
                            className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full blur-2xl transition-all duration-700"
                        />
                        <div className="relative z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#050508]/80 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)] group-hover:border-cyan-400 group-hover:bg-black transition-colors duration-300">
                            <Home className="w-4 h-4 md:w-5 md:h-5 text-white/70 group-hover:text-white transition-colors" />
                        </div>
                    </div>
                    <span className="hidden lg:block text-[10px] font-mono font-black italic uppercase tracking-[0.4em] text-white/50 group-hover:text-cyan-300 transition-all drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                        [ HOME ]
                    </span>
                </motion.div>
            </Link>

        </div>
    );
}