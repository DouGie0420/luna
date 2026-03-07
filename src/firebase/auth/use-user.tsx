'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import { onAuthStateChanged, type Auth, type User as FirebaseUser, Unsubscribe, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { FirebaseContext } from '@/firebase/provider';
import type { UserProfile } from '@/lib/types';
import { updateUserProfile } from '@/lib/user';

interface UserState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
}

interface UserContextType extends UserState {
  signOut: () => Promise<void>;
}

export const useUser = (): UserContextType => {
  const [userState, setUserState] = useState<UserState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  const firebase = useContext(FirebaseContext);
  const auth = firebase?.auth;
  const firestore = firebase?.firestore;

  // 登出函数
  const signOut = useCallback(async (): Promise<void> => {
    if (!auth) {
      console.error('Auth not initialized');
      return;
    }
    try {
      await firebaseSignOut(auth);
      console.log('User signed out successfully');
    } catch (err) {
      console.error('Sign out error:', err);
      throw err;
    }
  }, [auth]);

  useEffect(() => {
    if (!auth || !firestore) {
      setUserState(s => ({ ...s, loading: false }));
      return;
    }

    let unsubscribeProfile: Unsubscribe = () => {};

    // 监听 Auth 状态
    const authUnsubscribe = onAuthStateChanged(auth, async (authUser) => {
      // 每次 Auth 改变，先清理之前的 Profile 监听
      unsubscribeProfile();

      if (!authUser) {
        setUserState({ user: null, profile: null, loading: false, error: null });
        return;
      }

      // 【关键逻辑】：建立 Firestore 实时监听
      const profileRef = doc(firestore, 'users', authUser.uid);

      unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
        const profileData = docSnap.exists() ? (docSnap.data() as UserProfile) : null;

        if (profileData) {
            const updatePayload: Partial<UserProfile> = {};

            // 1. Fix role and emailVerified status
            if (authUser.emailVerified && (profileData.role === 'guest' || !profileData.emailVerified)) {
                if (profileData.role === 'guest') {
                    updatePayload.role = 'user';
                }
                if (!profileData.emailVerified) {
                    updatePayload.emailVerified = true;
                }
            }

            // 2. Fix missing loginId for old accounts by falling back to UID
            if (!profileData.loginId) {
                updatePayload.loginId = authUser.uid;
            }

            // 3. If any updates are needed, fire them off
            if (Object.keys(updatePayload).length > 0) {
                 updateUserProfile(firestore, authUser.uid, updatePayload);
                 // onSnapshot will handle re-render with fresh data, so we just trigger the update.
            }
        }

        setUserState({
          user: authUser,
          profile: profileData,
          loading: false,
          error: null
        });
      }, (error) => {
        console.error("Profile 监听失败:", error);
        setUserState(s => ({ ...s, error: error as Error, loading: false }));
      });

    });

    return () => {
      authUnsubscribe();
      unsubscribeProfile();
    };
  }, [auth, firestore]);

  return { ...userState, signOut };
};
