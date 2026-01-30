'use client';

import { useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, type Auth, type User as FirebaseUser, type UserInfo, type UserMetadata, type IdTokenResult } from 'firebase/auth';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import { FirebaseContext } from '@/firebase/provider';
import type { UserProfile } from '@/lib/types';

interface UserState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
}

const testUser: FirebaseUser = {
  uid: 'test-user-uid',
  email: 'test@example.com',
  displayName: '测试用户',
  photoURL: 'https://picsum.photos/seed/test-user/100/100',
  providerId: 'test',
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: new Date().toUTCString(),
    lastSignInTime: new Date().toUTCString(),
  } as UserMetadata,
  providerData: [{
    providerId: 'password',
    uid: 'test@example.com',
    displayName: '测试用户',
    email: 'test@example.com',
    photoURL: 'https://picsum.photos/seed/test-user/100/100',
    phoneNumber: null,
  } as UserInfo],
  refreshToken: 'test-refresh-token',
  tenantId: null,
  delete: async () => { console.log('delete called'); },
  getIdToken: async () => 'test-id-token',
  getIdTokenResult: async () => ({ token: 'test-id-token' } as IdTokenResult),
  reload: async () => { console.log('reload called'); },
  toJSON: () => ({ uid: 'test-user-uid', email: 'test@example.com', displayName: '测试用户' }),
};

const testProfile: UserProfile = {
  uid: 'test-user-uid',
  email: 'test@example.com',
  displayName: '测试用户',
  photoURL: 'https://picsum.photos/seed/test-user/100/100',
  kycStatus: 'Verified',
  createdAt: new Date(),
  lastLogin: new Date(),
};


export const useFirebaseAuth = (): Auth | null => {
  const firebase = useContext(FirebaseContext);
  return firebase?.auth ?? null;
};

export const useUser = (): UserState => {
  const [userState, setUserState] = useState<UserState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  const auth = useFirebaseAuth();
  const firestore = useContext(FirebaseContext)?.firestore;

  useEffect(() => {
    // This code runs only on the client, so `localStorage` is safe to use.
    if (typeof window !== 'undefined') {
      const isTestUser = localStorage.getItem('isTestUser') === 'true';
      if (isTestUser) {
        setUserState({
          user: testUser,
          profile: testProfile,
          loading: false,
          error: null,
        });
        return; // Don't attach real auth listener
      }
    }

    if (!auth || !firestore) {
      // Firebase context might not be available yet
      if (!userState.loading) {
        setUserState((s) => ({ ...s, loading: true }));
      }
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          // User is signed in, now listen for profile changes
          const profileRef = doc(firestore, 'users', user.uid);
          const unsubscribeProfile = onSnapshot(
            profileRef,
            (doc) => {
              if (doc.exists()) {
                setUserState({
                  user,
                  profile: doc.data() as UserProfile,
                  loading: false,
                  error: null,
                });
              } else {
                // Profile doesn't exist yet. This might happen briefly after signup.
                 setUserState({ user, profile: null, loading: false, error: null });
              }
            },
            (error) => {
              console.error('Error fetching user profile:', error);
              setUserState({ user, profile: null, loading: false, error });
            }
          );
          
          return () => unsubscribeProfile();
        } else {
          // User is signed out
          setUserState({ user: null, profile: null, loading: false, error: null });
        }
      },
      (error) => {
        console.error('Auth state change error:', error);
        setUserState({ user: null, profile: null, loading: false, error });
      }
    );

    return () => unsubscribeAuth();
  }, [auth, firestore]);

  return userState;
};
