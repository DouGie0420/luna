'use client';

import { doc, setDoc, getDoc, serverTimestamp, Firestore, updateDoc } from 'firebase/firestore';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import type { UserProfile } from './types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export async function upsertUserProfile(
    db: Firestore, 
    user: FirebaseAuthUser,
    additionalData: Partial<UserProfile> = {}
): Promise<UserProfile> {
    const userRef = doc(db, 'users', user.uid);
    
    // This initial read is allowed for all, so doesn't need special error handling.
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        const userProfile = userDoc.data() as UserProfile;
        
        const updateData: { [key: string]: any } = {
            lastLogin: serverTimestamp(),
            photoURL: user.photoURL || userProfile.photoURL,
            displayName: userProfile.displayName || user.displayName || 'User',
        };

        if (userProfile.emailVerified !== true) {
            updateData.emailVerified = user.emailVerified;
        }
        if (user.emailVerified && userProfile.role === 'guest') {
            updateData.role = 'user';
        }

        try {
            await updateDoc(userRef, updateData);
        } catch (serverError) {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        }

        const updatedDoc = await getDoc(userRef);
        return updatedDoc.data() as UserProfile;

    } else {
        const newUserProfile: Omit<UserProfile, 'uid'> & { createdAt: any, lastLogin: any } = {
            email: additionalData.email || user.email || '',
            displayName: additionalData.displayName || user.displayName || 'New User',
            photoURL: user.photoURL || `https://api.dicebear.com/8.x/pixel-art/svg?seed=${user.uid}`,
            emailVerified: user.emailVerified,
            gender: '保密',
            location: '',
            bio: '',
            kycStatus: 'Not Verified',
            isPro: false,
            isWeb3Verified: false,
            isNftVerified: false,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            rating: 0,
            reviewsCount: 0,
            salesCount: 0,
            purchasesCount: 0,
            followersCount: 0,
            followingCount: 0,
            creditScore: 0,
            creditLevel: 'Newcomer',
            role: 'guest',
            postsCount: 0,
            ...additionalData
        };
        const dataToSet = { ...newUserProfile, uid: user.uid };

        try {
            await setDoc(userRef, dataToSet);
        } catch (serverError) {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'create',
                requestResourceData: dataToSet,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        }
        
        const createdDoc = await getDoc(userRef);
        return createdDoc.data() as UserProfile;
    }
}

export async function upsertWalletUser(db: Firestore, address: string): Promise<UserProfile> {
    const userRef = doc(db, 'users', address);
    
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        const updateData = { lastLogin: serverTimestamp() };
        try {
            await updateDoc(userRef, updateData);
        } catch (serverError) {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        }
        const updatedDoc = await getDoc(userRef);
        return updatedDoc.data() as UserProfile;
    } else {
        const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
        const newUserProfile: Omit<UserProfile, 'uid'> & { createdAt: any, lastLogin: any } = {
            displayName: shortAddress,
            photoURL: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${address}`,
            emailVerified: true,
            kycStatus: 'Not Verified',
            isWeb3Verified: true,
            isNftVerified: false,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            rating: 0,
            reviewsCount: 0,
            salesCount: 0,
            purchasesCount: 0,
            followersCount: 0,
            followingCount: 0,
            creditScore: 0,
            creditLevel: 'Newcomer',
            role: 'user',
            postsCount: 0,
        };
        const dataToSet = { ...newUserProfile, uid: address };
        try {
            await setDoc(userRef, dataToSet);
        } catch (serverError) {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'create',
                requestResourceData: dataToSet,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        }
        const createdDoc = await getDoc(userRef);
        return createdDoc.data() as UserProfile;
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
        throw permissionError;
    });
}
