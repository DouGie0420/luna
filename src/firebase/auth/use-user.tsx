'use client';

import { useState, useEffect, useContext, useRef } from 'react';
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
    // This effect should only run once on mount to set up listeners.
    // The dependencies `auth` and `firestore` should be stable.
    if (!auth || !firestore) {
      setUserState(s => s.loading ? s : { ...s, loading: true });
      return;
    }

    // --- Test User Logic ---
    if (typeof window !== 'undefined' && localStorage.getItem('isTestUser') === 'true') {
      setUserState({ user: testUser, profile: testProfile, loading: false, error: null });
      return;
    }

    // --- Wallet User Logic (Non-Firebase Auth) ---
    const walletUserString = typeof window !== 'undefined' ? localStorage.getItem('walletUser') : null;
    if (walletUserString) {
        const walletUser = JSON.parse(walletUserString);
        const mockUser = createMockFirebaseUser(walletUser);
        const profileRef = doc(firestore, 'users', mockUser.uid);

        const unsubscribeProfile = onSnapshot(profileRef, 
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
        return () => unsubscribeProfile();
    }
    
    // --- Standard Firebase Auth Logic ---
    let profileUnsubscribe: Unsubscribe | null = null;
    
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
        // Clean up previous profile listener if it exists
        if (profileUnsubscribe) {
            profileUnsubscribe();
            profileUnsubscribe = null;
        }

        if (user) {
            await user.reload(); // Always get the freshest auth state
            const freshUser = auth.currentUser; // The user object from reload

            if (!freshUser) {
                setUserState({ user: null, profile: null, loading: false, error: null });
                return;
            }

            const profileRef = doc(firestore, 'users', freshUser.uid);
            profileUnsubscribe = onSnapshot(profileRef, 
                (profileDoc) => {
                    const profileData = profileDoc.exists() ? (profileDoc.data() as UserProfile) : null;
                    
                    // Use functional update to avoid stale state issues.
                    setUserState(prevState => ({
                        ...prevState,
                        user: freshUser,
                        profile: profileData,
                        loading: false,
                        error: null,
                    }));

                    // Side-effect to sync auth state to firestore profile
                    if (profileData) {
                        const updates: Partial<UserProfile> = {};
                        if (freshUser.emailVerified && !profileData.emailVerified) {
                            updates.emailVerified = true;
                        }
                        if (freshUser.emailVerified && profileData.role === 'guest') {
                            updates.role = 'user';
                        }
                        if (Object.keys(updates).length > 0) {
                            updateUserProfile(firestore, freshUser.uid, updates);
                        }
                    }
                },
                (error) => {
                    console.error('Error fetching user profile:', error);
                    setUserState(prevState => ({ ...prevState, user: freshUser, profile: null, loading: false, error }));
                }
            );
        } else {
            // User is signed out
            setUserState({ user: null, profile: null, loading: false, error: null });
        }
    }, (error) => {
        console.error('Auth state change error:', error);
        setUserState({ user: null, profile: null, loading: false, error });
    });

    // Cleanup function for the main useEffect
    return () => {
        authUnsubscribe();
        if (profileUnsubscribe) {
            profileUnsubscribe();
        }
    };
  }, [auth, firestore]);

  return userState;
};
