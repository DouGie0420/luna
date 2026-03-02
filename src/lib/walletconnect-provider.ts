/**
 * WalletConnect Provider Integration
 * Enables mobile wallet connections via WalletConnect v2
 */

import { EthereumProvider } from '@walletconnect/ethereum-provider';
import { BrowserProvider } from 'ethers';

// WalletConnect project ID from environment
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

// Base Mainnet configuration
const BASE_MAINNET = {
  chainId: 8453,
  name: 'Base Mainnet',
  currency: 'ETH',
  rpcUrl: 'https://mainnet.base.org',
  explorerUrl: 'https://basescan.org'
};

interface WalletConnectConfig {
  projectId: string;
  chains: number[];
  showQrModal: boolean;
  metadata?: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
}

// Default configuration
const defaultConfig: WalletConnectConfig = {
  projectId: WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID', // Fallback for development
  chains: [BASE_MAINNET.chainId],
  showQrModal: true,
  metadata: {
    name: 'LUNA Marketplace',
    description: 'Decentralized marketplace on Base Mainnet',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://luna.market',
    icons: ['https://luna.market/icon.png']
  }
};

let walletConnectProvider: EthereumProvider | null = null;

/**
 * Initialize WalletConnect provider
 */
export async function initWalletConnect(): Promise<EthereumProvider> {
  if (!WALLETCONNECT_PROJECT_ID) {
    throw new Error('WalletConnect project ID is not configured. Please set NEXT_PUBLIC_WC_PROJECT_ID in .env.local');
  }

  if (walletConnectProvider && walletConnectProvider.session) {
    return walletConnectProvider;
  }

  try {
    walletConnectProvider = await EthereumProvider.init({
      ...defaultConfig,
      projectId: WALLETCONNECT_PROJECT_ID,
    });

    // Set up event listeners
    setupEventListeners(walletConnectProvider);

    return walletConnectProvider;
  } catch (error) {
    console.error('[WalletConnect] Failed to initialize provider:', error);
    throw error;
  }
}

/**
 * Connect to wallet via WalletConnect
 */
export async function connectWalletConnect(): Promise<BrowserProvider> {
  try {
    const provider = await initWalletConnect();
    
    // Enable session (triggers QR modal if needed)
    await provider.connect();

    // Create ethers provider
    const ethersProvider = new BrowserProvider(provider);
    
    console.log('[WalletConnect] Connected successfully');
    return ethersProvider;
  } catch (error) {
    console.error('[WalletConnect] Connection failed:', error);
    throw error;
  }
}

/**
 * Disconnect WalletConnect session
 */
export async function disconnectWalletConnect(): Promise<void> {
  if (walletConnectProvider) {
    try {
      await walletConnectProvider.disconnect();
      console.log('[WalletConnect] Disconnected successfully');
    } catch (error) {
      console.error('[WalletConnect] Disconnection error:', error);
    } finally {
      walletConnectProvider = null;
    }
  }
}

/**
 * Check if WalletConnect is connected
 */
export function isWalletConnectConnected(): boolean {
  return !!(walletConnectProvider && walletConnectProvider.session);
}

/**
 * Get current WalletConnect provider instance
 */
export function getWalletConnectProvider(): EthereumProvider | null {
  return walletConnectProvider;
}

/**
 * Setup event listeners for WalletConnect provider
 */
function setupEventListeners(provider: EthereumProvider): void {
  provider.on('display_uri', (uri: string) => {
    console.log('[WalletConnect] Display URI:', uri);
    // You could display a custom QR code here if needed
  });

  provider.on('session_delete', () => {
    console.log('[WalletConnect] Session deleted');
    walletConnectProvider = null;
  });

  provider.on('chainChanged', (chainId: string) => {
    console.log('[WalletConnect] Chain changed:', chainId);
  });

  provider.on('accountsChanged', (accounts: string[]) => {
    console.log('[WalletConnect] Accounts changed:', accounts);
  });
}

/**
 * Switch to Base Mainnet on WalletConnect
 */
export async function switchToBaseMainnet(): Promise<void> {
  if (!walletConnectProvider) {
    throw new Error('WalletConnect provider not initialized');
  }

  try {
    await walletConnectProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x2105' }] // 8453 in hex
    });
  } catch (error: any) {
    // If chain not added, add it
    if (error.code === 4902) {
      await walletConnectProvider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x2105',
          chainName: 'Base Mainnet',
          nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: ['https://mainnet.base.org'],
          blockExplorerUrls: ['https://basescan.org']
        }]
      });
    } else {
      throw error;
    }
  }
}

/**
 * Get WalletConnect QR code URI (for custom QR display)
 */
export function getWalletConnectUri(): string | null {
  if (!walletConnectProvider) return null;
  return walletConnectProvider.signClient?.session?.peer?.metadata?.url || null;
}