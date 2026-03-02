'use client';

import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';

// 定义支持的链接口
interface ChainInfo {
  chainId: number;
  name: string;
  currency: string;
  explorerUrl: string;
  rpcUrl: string;
}

// 支持的网络列表
const CHAINS: { [key: number]: ChainInfo } = {
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    currency: 'ETH',
    explorerUrl: 'https://etherscan.io',
    rpcUrl: 'https://cloudflare-eth.com',
  },
  137: {
    chainId: 137,
    name: 'Polygon Mainnet',
    currency: 'MATIC',
    explorerUrl: 'https://polygonscan.com',
    rpcUrl: 'https://polygon-rpc.com',
  },
  8453: { 
    chainId: 8453,
    name: 'Base Mainnet',
    currency: 'ETH',
    explorerUrl: 'https://basescan.org',
    rpcUrl: 'https://mainnet.base.org',
  },
};

/**
 * 获取 Ethers.js 的 BrowserProvider 实例。
 */
export async function getEthersProvider(toast?: ReturnType<typeof useToast>['toast']): Promise<BrowserProvider | undefined> {
  if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
    console.error('MetaMask/Web3 wallet not detected in browser environment.');
    toast?.({
      variant: "destructive",
      title: "钱包未检测到",
      description: "请安装 MetaMask 或其他 Web3 钱包浏览器扩展。",
      action: <ToastAction altText="Learn More" onClick={() => window.open('https://metamask.io/')}>了解更多</ToastAction>
    });
    return undefined;
  }
  return new BrowserProvider(window.ethereum);
}

/**
 * 获取 Ethers.js 的 JsonRpcSigner 实例。
 */
export async function getEthersSigner(toast?: ReturnType<typeof useToast>['toast']): Promise<JsonRpcSigner | undefined> {
  const provider = await getEthersProvider(toast);
  if (!provider) return undefined;

  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const signer = await provider.getSigner();
    toast?.({
      title: "钱包已连接",
      description: "成功连接到您的 Web3 钱包。",
    });
    return signer;
  } catch (error: any) {
    console.error('Failed to get signer:', error);
    toast?.({
      variant: "destructive",
      title: error.code === 4001 ? "连接被拒绝" : "连接失败",
      description: error.code === 4001 ? "用户拒绝了钱包连接请求。" : `无法连接钱包: ${error.message || error.toString()}`,
    });
    return undefined;
  }
}

/**
 * 尝试连接/切换到指定链。
 */
export async function connectToChain(targetChainId: number, toast?: ReturnType<typeof useToast>['toast']): Promise<boolean> {
  if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
    toast?.({
      variant: "destructive",
      title: "钱包未检测到",
      description: "请安装钱包扩展以继续。",
    });
    return false;
  }

  const provider = new BrowserProvider(window.ethereum);
  const targetChainInfo = CHAINS[targetChainId];

  if (!targetChainInfo) {
    toast?.({
      variant: "destructive",
      title: "不支持的链",
      description: `链ID ${targetChainId} 未配置。`,
    });
    return false;
  }

  try {
    const network = await provider.getNetwork();
    if (network.chainId === BigInt(targetChainId)) {
      toast?.({
        title: "网络匹配",
        description: `已连接到 ${targetChainInfo.name}。`,
      });
      return true;
    }

    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${targetChainId.toString(16)}` }],
    });
    return true;
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${targetChainId.toString(16)}`,
            chainName: targetChainInfo.name,
            nativeCurrency: {
              name: targetChainInfo.currency,
              symbol: targetChainInfo.currency,
              decimals: 18,
            },
            rpcUrls: [targetChainInfo.rpcUrl],
            blockExplorerUrls: [targetChainInfo.explorerUrl],
          }],
        });
        return true;
      } catch (addError: any) {
        console.error('Failed to add chain:', addError);
        return false;
      }
    }
    return false;
  }
}