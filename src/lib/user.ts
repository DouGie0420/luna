'use client';

import { doc, setDoc, getDoc, serverTimestamp, Firestore, updateDoc } from 'firebase/firestore';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import type { UserProfile } from './types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export async function upsertUserProfile(db: Firestore, user: FirebaseAuthUser): Promise<UserProfile> {
    const userRef = doc(db, 'users', user.uid);
    
    try {
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userProfile = userDoc.data() as UserProfile;
            const updateData = {
                lastLogin: serverTimestamp(),
                photoURL: user.photoURL || userProfile.photoURL,
                displayName: user.displayName || userProfile.displayName,
            };
            updateDoc(userRef, updateData).catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
            return { ...userProfile, ...updateData };
        } else {
            const newUserProfile: UserProfile = {
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName || 'New User',
                photoURL: user.photoURL || `https://api.dicebear.com/8.x/pixel-art/svg?seed=${user.uid}`,
                gender: '保密',
                location: '',
                bio: '',
                kycStatus: 'Not Verified',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                rating: 0,
                reviewsCount: 0,
                salesCount: 0,
                purchasesCount: 0,
                followersCount: 0,
                followingCount: 0,
                creditScore: 0,
                creditLevel: 'Newcomer'
            };
            setDoc(userRef, newUserProfile).catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'create',
                    requestResourceData: newUserProfile,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
            return newUserProfile;
        }
    } catch (error) {
        console.error("Error upserting user profile: ", error);
        // Re-throw or handle as a permission error if applicable
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    }
}

export function updateUserProfile(db: Firestore, uid: string, data: Partial<UserProfile>) {
    const userRef = doc(db, 'users', uid);
    return updateDoc(userRef, data).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
        // Re-throw the original error after emitting our custom one
        throw serverError;
    });
}
