"use client";
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_ESCROW_ADDRESS } from '@/lib/utils';
import { EscrowContractABI } from '@/lib/abi/escrow';

// Base主网配置
const BASE_CHAIN_ID = NEXT_PUBLIC_CHAIN_ID || 8453;
const BASE_RPC = 'https://mainnet.base.org';

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  address: string | null;
  // 为了兼容 WalletDropdown 等组件，提供 account 别名
  account: string | null;
  chainId: number | null;
  escrowContract: ethers.Contract | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToBase: () => Promise<void>;
  // 保留旧接口名以兼容
  switchToBaseTestnet: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [escrowContract, setEscrowContract] = useState<ethers.Contract | null>(null);

  // 初始化托管合约实例
  useEffect(() => {
    if (!provider || !signer || !NEXT_PUBLIC_ESCROW_ADDRESS) return;

    const contract = new ethers.Contract(
      NEXT_PUBLIC_ESCROW_ADDRESS,
      EscrowContractABI,
      signer
    );

    setEscrowContract(contract);
  }, [provider, signer]);

  // 连接钱包逻辑
  const connectWallet = useCallback(async () => {
    if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask或兼容钱包未安装');
    }
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    await browserProvider.send('eth_requestAccounts', []);
    const walletSigner = await browserProvider.getSigner();
    const walletAddress = await walletSigner.getAddress();
    const network = await browserProvider.getNetwork();

    setProvider(browserProvider);
    setSigner(walletSigner);
    setAddress(walletAddress);
    setChainId(Number(network.chainId));
  }, []);

  // 断开钱包连接
  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setEscrowContract(null);
  }, []);

  // 切换至Base主网逻辑
  const switchToBase = useCallback(async () => {
    if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask或兼容钱包未安装');
    }
    const chainIdHex = `0x${BASE_CHAIN_ID.toString(16)}`;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (err: any) {
      if (err.code === 4902) {
        // 未添加Base网时自动添加
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chainIdHex,
            chainName: 'Base',
            rpcUrls: [BASE_RPC],
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            blockExplorerUrls: ['https://basescan.org/']
          }]
        });
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') return;

    // 监听钱包账户变更
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        // 重新获取signer和地址
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        browserProvider.getSigner().then((newSigner) => {
          newSigner.getAddress().then((addr) => {
            setProvider(browserProvider);
            setSigner(newSigner);
            setAddress(addr);
          });
        }).catch(console.error);
      } else {
        disconnectWallet();
      }
    };

    // 监听链ID变更
    const handleChainChanged = () => {
      // 链变更时重新加载连接
      if (address) {
        connectWallet().catch(console.error);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [address, connectWallet, disconnectWallet]);

  return (
    <Web3Context.Provider value={{
      provider,
      signer,
      address,
      account: address, // account 是 address 的别名，兼容 WalletDropdown
      chainId,
      escrowContract,
      connectWallet,
      disconnectWallet,
      switchToBase,
      switchToBaseTestnet: switchToBase, // 保留旧接口名以兼容
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3必须在Web3Provider内部使用');
  }
  return context;
}
