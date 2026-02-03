'use client';

import { useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, type Auth, type User as FirebaseUser, Unsubscribe } from 'firebase/auth';
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

export const useUser = (): UserState => {
  const [userState, setUserState] = useState<UserState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  const firebase = useContext(FirebaseContext);
  const auth = firebase?.auth;
  const firestore = firebase?.firestore;

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
        
        // 自动修正 role 的逻辑（保留你原有的业务逻辑）
        if (profileData && authUser.emailVerified) {
            if (profileData.role === 'guest' || !profileData.emailVerified) {
                updateUserProfile(firestore, authUser.uid, { 
                    emailVerified: true, 
                    role: profileData.role === 'guest' ? 'user' : profileData.role 
                });
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

  return userState;
};