'use client';

import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from "@/components/ui/toaster";
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { LanguageProvider } from '@/context/language-provider';
import { SettingsProvider } from '@/context/settings-provider';
import dynamic from 'next/dynamic';

// 懒加载非关键组件 - ✅ 统一添加了 .then() 提取器，兼容所有导出方式
const FloatingSupportButton = dynamic(
  () => import('@/components/floating-support-button').then((mod) => mod.FloatingSupportButton || mod.default as any), 
  { ssr: false, loading: () => null }
);

const GlobalAudioPlayer = dynamic(
  () => import('@/components/global-audio-player').then((mod) => mod.GlobalAudioPlayer || mod.default as any), 
  { ssr: false, loading: () => null }
);

const PWAInitializer = dynamic(
  () => import('@/components/pwa/PWAInitializer').then((mod) => mod.PWAInitializer || mod.default as any), 
  { ssr: false, loading: () => null }
);

const GlobalChatNotifier = dynamic(
  () => import('@/components/chat/GlobalChatNotifier').then((mod) => mod.GlobalChatNotifier || mod.default as any), 
  { ssr: false, loading: () => null }
);

// 🚀 唯一的全局背景引擎 (包含：大尺寸流体 + 边缘巡逻蛇 + 像素网格) - 懒加载
const GlobalFluidBackground = dynamic(
  () => import('@/components/global-fluid-background').then((mod) => mod.GlobalFluidBackground || mod.default as any), 
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-gradient-to-br from-[#020203] via-[#0a0a0f] to-[#020203] z-0" />
    ),
  }
);

// 🚀 引入 Web3 总闸（全局提供钱包连接环境）


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@600;700&family=Press+Start+2P&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#020203" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={cn("font-sans", "bg-[#020203] text-foreground")}>
        
          <FirebaseClientProvider>
              <SettingsProvider>
                <LanguageProvider>
                  
                  {/* ✅ 唯一个背景入口：所有动效、网格、边缘蛇都在这里统一调度，极致省电 */}
                  <GlobalFluidBackground />

                  <div className="flex flex-col min-h-screen relative z-10">
                      <Header />
                      <main className="flex-grow flex flex-col">{children}</main>
                      <Footer />
                  </div>
                  
                  <Toaster />
                  <FirebaseErrorListener />
                  <FloatingSupportButton />
                  <GlobalAudioPlayer />
                  <PWAInitializer />
                  <GlobalChatNotifier />
                  
                </LanguageProvider>
              </SettingsProvider>
            </FirebaseClientProvider>
      </body>
    </html>
  );
}