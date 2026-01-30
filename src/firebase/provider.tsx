'use client';

import React, { createContext, useContext } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

interface FirebaseContextValue {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

export const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export const FirebaseProvider = ({
  children,
  ...props
}: { children: React.ReactNode } & FirebaseContextValue) => {
  return (
    <FirebaseContext.Provider value={props}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  return useContext(FirebaseContext);
}

export const useFirebaseApp = (): FirebaseApp | null => {
  const firebase = useContext(FirebaseContext);
  return firebase?.app ?? null;
};

export const useAuth = (): Auth | null => {
    const firebase = useContext(FirebaseContext);
    return firebase?.auth ?? null;
}

export const useFirestore = (): Firestore | null => {
    const firebase = useContext(FirebaseContext);
    return firebase?.firestore ?? null;
}
