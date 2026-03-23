'use client';

/**
 * Universe 专用布局
 * 不使用主站的Header/Footer，提供沉浸式全屏体验
 * 注意：仍然复用主站的 Firebase + Web3 Provider（来自根layout）
 */

export default function UniverseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#020203] overflow-hidden">
      {children}
    </div>
  );
}
