// 像素赛博 UI 组件库 - 完整修复版 (处理 Hydration Mismatch)
'use client';

import { ReactNode, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function PixelContainer({ children, className = '', withParticles = true }: { children: ReactNode; className?: string; withParticles?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []); // 🛠️ 确保 Math.random 只在客户端运行

  return (
    <div className={`pixel-grid-bg min-h-screen ${className}`}>
      {withParticles && mounted && (
        <div className="pixel-particles">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="pixel-particle"
              style={{ left: `${Math.random() * 100}%` }}
              animate={{ y: ['100vh', '-100px'], x: [0, (Math.random() - 0.5) * 100] }}
              transition={{ duration: 5 + Math.random() * 10, repeat: Infinity, ease: 'linear' }}
            />
          ))}
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ... 保持 PixelButton, PixelCard, PixelStat, PixelProgress, PixelAvatar, PixelChatBubble, PixelListItem, PixelStatusIndicator, PixelPotionCard, PixelStepIndicator 逻辑完全一致 ...
// 篇幅限制，请确保将你原有的这些组件代码接在后面