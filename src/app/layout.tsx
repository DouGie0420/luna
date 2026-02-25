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
import { BackgroundSnake } from '@/components/background-snake';
import { GlobalAudioPlayer } from '@/components/global-audio-player';

// 🚀 导入全局智能流体引擎
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
      <body className={cn("font-sans", "bg-background text-foreground")}>
        <FirebaseClientProvider>
          <SettingsProvider>
            <LanguageProvider>
              
              {/* 🚀 注入全局流体能量场 (它自带 z-index: -50 会自动沉入最底层) */}
              <GlobalFluidBackground />

              {/* 🚀 完美保留你的像素网格和蛇游戏，它们会覆盖在流体上方 */}
              <div className="pixel-grid-bg" />
              <BackgroundSnake />
              
              <div className="flex flex-col min-h-screen">
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