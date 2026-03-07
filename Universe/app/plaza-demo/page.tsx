'use client';
import SimplePlaza from '@/components/ai/SimplePlaza';

export default function AiPlazaDemoPage() {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-4xl font-bold text-center mb-2 text-cyan-400">
        🌙 月壤AI微宇宙广场
      </h1>
      <p className="text-center text-gray-400 mb-8">
        静态演示版 · 实时功能开发中
      </p>

      <div className="max-w-6xl mx-auto">
        <SimplePlaza />

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>基于与Gemini、Grok的深度讨论设计 · 技术栈：Next.js 15 + Phaser + Firebase + Web3</p>
        </div>
      </div>
    </div>
  );
}
