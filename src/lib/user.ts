'use client';

import { doc, setDoc, getDoc, serverTimestamp, Firestore } from 'firebase/firestore';
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
            setDoc(userRef, updateData, { merge: true }).catch((serverError) => {
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
                photoURL: user.photoURL || '',
                kycStatus: 'Not Verified',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
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
