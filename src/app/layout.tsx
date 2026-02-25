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
import { FloatingSupportButton } from '@/components/floating-support-button';
import { GlobalAudioPlayer } from '@/components/global-audio-player';

// 🚀 唯一的全局背景引擎 (包含：大尺寸流体 + 边缘巡逻蛇 + 像素网格)
import { GlobalFluidBackground } from '@/components/global-fluid-background';

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
              
            </LanguageProvider>
          </SettingsProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}