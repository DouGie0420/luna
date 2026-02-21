
'use client';

import { ethers } from 'ethers';
import { upsertWalletUser } from '@/lib/user';
import type { Firestore } from 'firebase/firestore';
import type { UserProfile } from './types';

/**
 * Generates a random nonce for the user to sign.
 * In a real SIWE implementation, this should be generated and stored server-side.
 */
function generateNonce() {
  return `Welcome to LUNA! Click to sign in and accept the LUNA Terms of Service. This request will not trigger a blockchain transaction or cost any gas fees. Nonce: ${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Connects to MetaMask, signs a message, and simulates a login.
 * @param firestore - The Firestore instance.
 * @returns A promise that resolves to the user's profile.
 */
export async function signInWithMetaMask(firestore: Firestore): Promise<UserProfile> {
  // Check if MetaMask is installed
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed. Please install it to use this feature.');
  }

  try {
    // Use ethers to wrap the window.ethereum provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // 1. Explicitly request accounts to trigger MetaMask prompt
    await provider.send("eth_requestAccounts", []);

    // 2. Get the signer after connection is approved
    const signer = await provider.getSigner();
    const address = (await signer.getAddress()).toLowerCase();

    // 3. Generate and sign a nonce (client-side for this prototype)
    const nonce = generateNonce();
    await signer.signMessage(nonce);

    // --- In a real app, you would now call your backend 'verifySignature' function ---
    // const customToken = await verifySignatureOnBackend(address, nonce, signature);
    // await signInWithCustomToken(auth, customToken);
    //
    // For this prototype, we will skip backend verification and simulate the login.

    // 4. Create or update user profile in Firestore
    const profile = await upsertWalletUser(firestore, address);

    // 5. Simulate login by storing user info in localStorage
    const walletUser = {
        uid: address,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        isWeb3: true,
    };
    localStorage.setItem('walletUser', JSON.stringify(walletUser));

    return profile;
  } catch (error: any) {
    // Forward the error to be displayed in a toast by the caller
    console.error("Error in signInWithMetaMask:", error);
    throw error;
  }
}
