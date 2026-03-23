'use client';

import { Toaster } from "@/components/ui/toaster";
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { LanguageProvider } from '@/context/language-provider';
import { SettingsProvider } from '@/context/settings-provider';
import { Web3Provider } from '@/contexts/Web3Context';
import dynamic from 'next/dynamic';

const FloatingSupportButton = dynamic(
  () => import('@/components/floating-support-button').then((mod) => mod.FloatingSupportButton),
  { ssr: false, loading: () => null }
);

const GlobalAudioPlayer = dynamic(
  () => import('@/components/global-audio-player').then((mod) => mod.GlobalAudioPlayer),
  { ssr: false, loading: () => null }
);

const PWAInitializer = dynamic(
  () => import('@/components/pwa/PWAInitializer').then((mod) => mod.PWAInitializer),
  { ssr: false, loading: () => null }
);

const GlobalChatNotifier = dynamic(
  () => import('@/components/chat/GlobalChatNotifier').then((mod) => mod.GlobalChatNotifier),
  { ssr: false, loading: () => null }
);

const GlobalFluidBackground = dynamic(
  () => import('@/components/global-fluid-background').then((mod) => mod.GlobalFluidBackground),
  {
    ssr: false,
    loading: () => <div className="fixed inset-0 bg-[#020203] z-[-1]" />,
  }
);

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <SettingsProvider>
        <LanguageProvider>
          <Web3Provider>
            <GlobalFluidBackground />
            <div className="flex flex-col min-h-screen relative z-10 bg-transparent">
              <Header />
              <main className="flex-grow flex flex-col bg-transparent">
                {children}
              </main>
              <Footer />
            </div>
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
  );
}