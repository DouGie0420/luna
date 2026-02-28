'use client';

import { ethers } from 'ethers';
import { upsertWalletUser } from '@/lib/user';
import type { Firestore } from 'firebase/firestore';
import type { UserProfile } from './types';

function generateNonce() {
  return `Welcome to LUNA! Click to sign in and accept the LUNA Terms of Service. Nonce: ${Math.random().toString(36).substring(2, 15)}`;
}

export async function signInWithMetaMask(firestore: Firestore): Promise<UserProfile> {
  // 1. 物理检查
  if (typeof window.ethereum === 'undefined') {
    throw new Error('GATEWAY_OFFLINE: MetaMask is not installed.');
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // 🚀 核心修复：增加 15 秒超时逻辑，防止弱网环境下死锁
    const requestPromise = provider.send("eth_requestAccounts", []);
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("LINK_TIMEOUT: Connection timed out in orbit.")), 15000)
    );

    // 竞速执行
    await Promise.race([requestPromise, timeoutPromise]);

    const signer = await provider.getSigner();
    const address = (await signer.getAddress()).toLowerCase();

    const nonce = generateNonce();
    await signer.signMessage(nonce);

    const profile = await upsertWalletUser(firestore, address);

    const walletUser = {
        uid: address,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        isWeb3: true,
    };
    localStorage.setItem('walletUser', JSON.stringify(walletUser));

    return profile;
  } catch (error: any) {
    // 🛡️ 拦截用户取消操作
    if (error.code === 4001) {
        throw new Error('LINK_DENIED: Protocol handshake rejected by user.');
    }
    console.error("LUNA_WEB3_FATAL:", error);
    throw error;
  }
}