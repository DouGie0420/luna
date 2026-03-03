'use client';

import React, { useState, useEffect } from 'react';
import { initializeFirebase, FirebaseProvider } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

interface FirebaseInstances {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [firebase, setFirebase] = useState<FirebaseInstances | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initFirebase = async () => {
      try {
        console.log(
          'Firebase Auth Domain Hint:',
          window.location.hostname
        );

        const instances = initializeFirebase();

        if (!instances || !instances.app || !instances.auth || !instances.firestore) {
          throw new Error('Firebase initialization returned incomplete instances');
        }

        console.log('Firebase initialized successfully');

        if (isMounted) {
          setFirebase(instances);
          setIsInitializing(false);
        }
      } catch (err) {
        console.error('Firebase initialization error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize Firebase');
          setIsInitializing(false);
        }
      }
    };

    initFirebase();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#020203] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-white/60 text-sm">正在初始化...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#020203] flex items-center justify-center p-4">
        <div className="bg-[#0a0a0f]/80 border border-red-500/30 rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="text-red-400 text-xl">!</span>
            </div>
            <h1 className="text-white text-lg font-semibold">初始化错误</h1>
          </div>
          <p className="text-white/60 text-sm mb-4">
            Firebase 初始化失败: {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
          >
            重新加载页面
          </button>
        </div>
      </div>
    );
  }

  if (!firebase) {
    return (
      <div className="min-h-screen bg-[#020203] flex items-center justify-center">
        <div className="text-white/60">初始化失败，请刷新页面重试</div>
      </div>
    );
  }

  return (
    <FirebaseProvider
      app={firebase.app}
      auth={firebase.auth}
      firestore={firebase.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
