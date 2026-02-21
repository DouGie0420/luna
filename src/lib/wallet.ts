
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

    // 1. Request account access first using provider.getSigner()
    const signer = await provider.getSigner();
    const address = (await signer.getAddress()).toLowerCase();

    // 2. Generate and sign a nonce (client-side for this prototype)
    const nonce = generateNonce();
    await signer.signMessage(nonce);

    // --- In a real app, you would now call your backend 'verifySignature' function ---
    // const customToken = await verifySignatureOnBackend(address, nonce, signature);
    // await signInWithCustomToken(auth, customToken);
    //
    // For this prototype, we will skip backend verification and simulate the login.

    // 3. Create or update user profile in Firestore
    const profile = await upsertWalletUser(firestore, address);

    // 4. Simulate login by storing user info in localStorage
    const walletUser = {
        uid: address,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        isWeb3: true,
    };
    localStorage.setItem('walletUser', JSON.stringify(walletUser));

    // NOTE: The next step is to create a placeholder for associating an NFT avatar.
    // This would likely happen on the user profile page after login.
    // e.g., a function like `updateAvatarToNFT(address)` would be called there.

    return profile;
  } catch (error: any) {
    // Forward the error to be displayed in a toast by the caller
    throw error;
  }
}
