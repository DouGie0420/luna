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

// 🚀 引入 Web3 总闸（全局提供钱包连接环境）
import { Web3Provider } from '@/contexts/Web3Context';

// 🚀 核心修复：将 (mod) 改为 (mod: any)，彻底消灭 "Property 'default' does not exist" 报错
const FloatingSupportButton = dynamic(
  () => import('@/components/floating-support-button').then((mod: any) => mod.FloatingSupportButton || mod.default), 
  { ssr: false, loading: () => null }
);

const GlobalAudioPlayer = dynamic(
  () => import('@/components/global-audio-player').then((mod: any) => mod.GlobalAudioPlayer || mod.default), 
  { ssr: false, loading: () => null }
);

const PWAInitializer = dynamic(
  () => import('@/components/pwa/PWAInitializer').then((mod: any) => mod.PWAInitializer || mod.default), 
  { ssr: false, loading: () => null }
);

const GlobalChatNotifier = dynamic(
  () => import('@/components/chat/GlobalChatNotifier').then((mod: any) => mod.GlobalChatNotifier || mod.default), 
  { ssr: false, loading: () => null }
);

/**
 * 🚀 唯一的全局背景引擎
 * 确保 loading 状态的 z-index 与组件内部一致
 */
const GlobalFluidBackground = dynamic(
  () => import('@/components/global-fluid-background').then((mod: any) => mod.GlobalFluidBackground || mod.default), 
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-[#020203] z-[-1]" />
    ),
  }
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ✅ 这里的 translate="no" 彻底解决了你之前 "removeChild" 的崩溃报错！
    <html lang="en" translate="no" className="notranslate" suppressHydrationWarning>
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
      <body className={cn("font-sans", "bg-[#020203] text-foreground antialiased")}>
        
        <FirebaseClientProvider>
          <SettingsProvider>
            <LanguageProvider>
              <Web3Provider>
                
                {/* 1. 背景引擎：确保它在最底层渲染 */}
                <GlobalFluidBackground />

                {/* 2. 内容包装层：必须显式声明 bg-transparent 和 z-index */}
                <div className="flex flex-col min-h-screen relative z-10 bg-transparent">
                  <Header />
                  <main className="flex-grow flex flex-col bg-transparent">
                    {children}
                  </main>
                  <Footer />
                </div>
                
                {/* 3. 功能性组件 */}
                <Toaster />
                <FirebaseErrorListener />
                <FloatingSupportButton />
                <GlobalAudioPlayer />
                <PWAInitializer />
                <GlobalChatNotifier />

              </Web3Provider>
            </LanguageProvider>
          </SettingsProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}