'use client';

import { useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, type Auth, type User as FirebaseUser, type UserInfo, type UserMetadata, type IdTokenResult, Unsubscribe } from 'firebase/auth';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import { FirebaseContext } from '@/firebase/provider';
import type { UserProfile } from '@/lib/types';
import { updateUserProfile } from '@/lib/user';

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
  emailVerified: true,
  isPro: true,
  isWeb3Verified: true,
  isNftVerified: true,
  createdAt: new Date(),
  lastLogin: new Date(),
  rating: 4.9,
  reviewsCount: 150,
  salesCount: 88,
  purchasesCount: 120,
  followersCount: 123,
  followingCount: 45,
  creditScore: 985,
  creditLevel: 'Gold',
};

function createMockFirebaseUser(userInfo: { uid: string, displayName: string, photoURL: string }): FirebaseUser {
    return {
        uid: userInfo.uid,
        email: null,
        displayName: userInfo.displayName,
        photoURL: userInfo.photoURL,
        providerId: 'web3',
        emailVerified: false,
        isAnonymous: false,
        metadata: { creationTime: new Date().toUTCString(), lastSignInTime: new Date().toUTCString() } as UserMetadata,
        providerData: [],
        refreshToken: 'mock-refresh-token',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => 'mock-id-token',
        getIdTokenResult: async () => ({ token: 'mock-id-token' } as IdTokenResult),
        reload: async () => {},
        toJSON: () => ({ ...userInfo, email: null }),
    };
}

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
    if (!auth || !firestore) {
      setUserState(s => ({ ...s, loading: true }));
      return;
    }

    let unsubscribe: Unsubscribe = () => {};

    const authUnsubscribe = onAuthStateChanged(auth, (authUser) => {
      unsubscribe(); // Unsubscribe from previous profile listener

      if (typeof window !== 'undefined' && localStorage.getItem('isTestUser') === 'true') {
        setUserState({ user: testUser, profile: testProfile, loading: false, error: null });
        return;
      }
      
      const walletUserString = typeof window !== 'undefined' ? localStorage.getItem('walletUser') : null;
      if (walletUserString) {
          const walletUser = JSON.parse(walletUserString);
          const mockUser = createMockFirebaseUser(walletUser);
          const profileRef = doc(firestore, 'users', mockUser.uid);
          unsubscribe = onSnapshot(profileRef, 
              (docSnapshot) => {
                  setUserState({
                      user: mockUser,
                      profile: docSnapshot.exists() ? (docSnapshot.data() as UserProfile) : null,
                      loading: false,
                      error: null,
                  });
              },
              (error) => {
                  console.error("Wallet user profile snapshot error:", error);
                  setUserState({ user: mockUser, profile: null, loading: false, error });
              }
          );
          return;
      }
      
      if (authUser) {
        // Reload user to get fresh emailVerified status
        authUser.reload().then(() => {
          const profileRef = doc(firestore, 'users', authUser.uid);
          unsubscribe = onSnapshot(profileRef,
            (profileDoc) => {
              const profileData = profileDoc.exists() ? (profileDoc.data() as UserProfile) : null;

              if (profileData) {
                  const updates: Partial<UserProfile> = {};
                  // Use fresh user from auth after reload
                  if (auth.currentUser?.emailVerified && !profileData.emailVerified) {
                      updates.emailVerified = true;
                  }
                  if (auth.currentUser?.emailVerified && profileData.role === 'guest') {
                      updates.role = 'user';
                  }
                  if (Object.keys(updates).length > 0) {
                      updateUserProfile(firestore, authUser.uid, updates);
                  }
              }
              
              setUserState({ user: auth.currentUser, profile: profileData, loading: false, error: null });
            },
            (error) => {
              console.error('Profile snapshot error:', error);
              setUserState({ user: auth.currentUser, profile: null, loading: false, error });
            }
          );
        }).catch(err => {
            console.error("Failed to reload user", err);
            setUserState({ user: null, profile: null, loading: false, error: err as Error });
        })
      } else {
        setUserState({ user: null, profile: null, loading: false, error: null });
      }
    });

    return () => {
      authUnsubscribe();
      unsubscribe();
    };
  }, [auth, firestore]);

  return userState;
};
