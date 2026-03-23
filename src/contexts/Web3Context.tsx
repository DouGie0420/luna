"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { serverTimestamp } from 'firebase/firestore';
import { NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_ESCROW_ADDRESS } from '@/lib/utils';
import { EscrowContractABI } from '@/lib/abi/escrow';
import { useFirestore, useUser } from '@/firebase';
import { updateUserProfile } from '@/lib/user';
import { submitWalletChangeRequest } from '@/lib/wallet-change-requests';

const BASE_CHAIN_ID = NEXT_PUBLIC_CHAIN_ID || 8453;
const BASE_RPC = 'https://mainnet.base.org';

type WalletBindingStatus =
  | 'idle'
  | 'binding'
  | 'bound'
  | 'request_submitted'
  | 'pending_exists'
  | 'monthly_limit_reached'
  | 'error';

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  address: string | null;
  account: string | null;
  chainId: number | null;
  escrowContract: ethers.Contract | null;
  connectWallet: () => Promise<void>;
  isConnecting: boolean;
  disconnectWallet: () => void;
  switchToBase: () => Promise<void>;
  switchToBaseTestnet: () => Promise<void>;
  boundWalletAddress: string | null;
  walletBindingStatus: WalletBindingStatus;
  walletBindingMessage: string | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const { user, profile } = useUser();

  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [escrowContract, setEscrowContract] = useState<ethers.Contract | null>(null);

  const [walletBindingStatus, setWalletBindingStatus] = useState<WalletBindingStatus>('idle');
  const [walletBindingMessage, setWalletBindingMessage] = useState<string | null>(null);

  const walletSyncLockRef = useRef(false);
  const lastWalletSyncKeyRef = useRef('');
  const isConnectingRef = useRef(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const boundWalletAddress = profile?.walletAddress ? profile.walletAddress.toLowerCase() : null;

  useEffect(() => {
    if (!provider || !signer || !NEXT_PUBLIC_ESCROW_ADDRESS) return;
    const contract = new ethers.Contract(
      NEXT_PUBLIC_ESCROW_ADDRESS,
      EscrowContractABI,
      signer,
    );
    setEscrowContract(contract);
  }, [provider, signer]);

  const syncWalletFromProvider = useCallback(async () => {
    if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') return;

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });

      setChainId(Number(BigInt(currentChainId)));

      if (Array.isArray(accounts) && accounts.length > 0) {
        const walletSigner = await browserProvider.getSigner();
        const walletAddress = await walletSigner.getAddress();
        setProvider(browserProvider);
        setSigner(walletSigner);
        setAddress(walletAddress.toLowerCase());
      } else {
        setProvider(null);
        setSigner(null);
        setAddress(null);
      }
    } catch (error) {
      console.error('Failed to sync wallet state from provider:', error);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (isConnectingRef.current) return; // prevent concurrent calls
    console.log('[Web3] connectWallet called, window.ethereum:', typeof window !== 'undefined' ? typeof window.ethereum : 'SSR');
    if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask or compatible wallet is not installed');
    }

    isConnectingRef.current = true;
    setIsConnecting(true);
    try {
      // Use window.ethereum.request directly — more reliable than BrowserProvider.send
      console.log('[Web3] calling eth_requestAccounts...');
      const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('[Web3] accounts returned:', accounts);
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const walletSigner = await browserProvider.getSigner();
      const walletAddress = accounts[0];
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(walletSigner);
      setAddress(walletAddress.toLowerCase());
      setChainId(Number(network.chainId));
      setWalletBindingStatus('idle');
      setWalletBindingMessage(null);
    } finally {
      isConnectingRef.current = false;
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setEscrowContract(null);
    setWalletBindingStatus('idle');
    setWalletBindingMessage(null);
  }, []);

  const switchToBase = useCallback(async () => {
    if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask or compatible wallet is not installed');
    }

    const chainIdHex = `0x${BASE_CHAIN_ID.toString(16)}`;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (err: any) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chainIdHex,
            chainName: 'Base',
            rpcUrls: [BASE_RPC],
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            blockExplorerUrls: ['https://basescan.org/'],
          }],
        });
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        syncWalletFromProvider().catch(console.error);
      } else {
        disconnectWallet();
      }
    };

    const handleChainChanged = (newChainId: string) => {
      setChainId(Number(BigInt(newChainId)));
      syncWalletFromProvider().catch(console.error);
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    syncWalletFromProvider().catch(console.error);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnectWallet, syncWalletFromProvider]);

  useEffect(() => {
    const runWalletBindingFlow = async () => {
      if (!firestore || !user || !profile || !address) return;

      const connectedWallet = address.toLowerCase();
      const currentBoundWallet = profile.walletAddress?.toLowerCase?.() || '';
      const syncKey = `${user.uid}:${currentBoundWallet || 'none'}:${connectedWallet}`;

      if (syncKey === lastWalletSyncKeyRef.current || walletSyncLockRef.current) return;

      try {
        walletSyncLockRef.current = true;

        if (!currentBoundWallet) {
          lastWalletSyncKeyRef.current = syncKey;
          setWalletBindingStatus('binding');
          setWalletBindingMessage('Binding wallet to your account...');

          await updateUserProfile(firestore, user.uid, {
            walletAddress: connectedWallet,
            walletBindTime: serverTimestamp(),
            isWeb3Verified: true,
          });

          setWalletBindingStatus('bound');
          setWalletBindingMessage('Wallet has been bound successfully.');
          return;
        }

        if (currentBoundWallet === connectedWallet) {
          lastWalletSyncKeyRef.current = syncKey;
          setWalletBindingStatus('idle');
          setWalletBindingMessage(null);
          return;
        }

        const requestResult = await submitWalletChangeRequest({
          firestore,
          userId: user.uid,
          userName: profile.displayName || user.displayName || 'User',
          oldWalletAddress: currentBoundWallet,
          newWalletAddress: connectedWallet,
          source: 'auto_switch',
        });

        if (requestResult.ok) {
          lastWalletSyncKeyRef.current = syncKey;
          setWalletBindingStatus('request_submitted');
          setWalletBindingMessage('Wallet change request submitted. Waiting for admin approval.');
          return;
        }

        if (requestResult.code === 'pending_exists') {
          lastWalletSyncKeyRef.current = syncKey;
          setWalletBindingStatus('pending_exists');
          setWalletBindingMessage('You already have a pending wallet change request.');
          return;
        }

        if (requestResult.code === 'monthly_limit_reached') {
          lastWalletSyncKeyRef.current = syncKey;
          setWalletBindingStatus('monthly_limit_reached');
          setWalletBindingMessage('Monthly wallet change limit reached (2 approved requests).');
          return;
        }

        setWalletBindingStatus('error');
        setWalletBindingMessage(requestResult.message);
        lastWalletSyncKeyRef.current = '';
      } catch (error) {
        console.error('Wallet binding flow failed:', error);
        setWalletBindingStatus('error');
        setWalletBindingMessage('Failed to process wallet binding flow.');
        lastWalletSyncKeyRef.current = '';
      } finally {
        walletSyncLockRef.current = false;
      }
    };

    runWalletBindingFlow().catch(console.error);
  }, [firestore, user, profile, address]);

  return (
    <Web3Context.Provider value={{
      provider,
      signer,
      address,
      account: address,
      chainId,
      escrowContract,
      connectWallet,
      isConnecting,
      disconnectWallet,
      switchToBase,
      switchToBaseTestnet: switchToBase,
      boundWalletAddress,
      walletBindingStatus,
      walletBindingMessage,
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
}




