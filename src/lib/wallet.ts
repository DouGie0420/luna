import { JsonRpcSigner, BrowserProvider } from 'ethers';
import { upsertWalletUser } from '@/lib/user';
import { getEthersSigner, connectToChain } from './web3-provider'; // 引入新的web3-provider
import type { Firestore } from 'firebase/firestore';
import type { UserProfile } from './types';
import { useToast } from '@/hooks/use-toast'; // 导入 useToast hook 类型定义

function generateNonce() {
  return `Welcome to LUNA! Click to sign in and accept the LUNA Terms of Service. Nonce: ${crypto.randomUUID()}`;
}

// 建议所需链ID
const REQUIRED_CHAIN_ID = 84532; 

/**
 * 连接钱包并进行签名认证。支持MetaMask和通过Web3Modal连接的钱包。
 * @param firestore Firestore实例
 * @returns 用户资料
 */
export async function connectWallet(firestore: Firestore, toast?: ReturnType<typeof useToast>['toast']): Promise<UserProfile> {
  let signer: JsonRpcSigner | undefined;
  let provider: BrowserProvider | undefined;

  try {
    // 尝试通过Web3Modal获取signer (涵盖MetaMask和WalletConnect)
    signer = await getEthersSigner(toast);

    if (!signer) {
        throw new Error('LINK_DENIED: No wallet connected or user rejected connection.');
    }

    // 获取Provider用于网络检查
    provider = signer.provider as BrowserProvider; // 类型断言

    // 检查并连接到正确的链ID
    const isConnectedToRequiredChain = await connectToChain(REQUIRED_CHAIN_ID, toast);
    if (!isConnectedToRequiredChain) {
        throw new Error(`CHAIN_MISMATCH: Please connect to ${REQUIRED_CHAIN_ID} (Base Testnet).`);
    }

    // 重新获取signer以确保在正确链上
    signer = await getEthersSigner(toast);
    if (!signer) {
        throw new Error('LINK_DENIED: No wallet connected after chain switch.');
    }

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
    if (error.code === 4001) {
        throw new Error('LINK_DENIED: Protocol handshake rejected by user.');
    } else if (error.message.startsWith('CHAIN_MISMATCH')) {
        // 将链不匹配错误传递给上层处理，以便UI可以显示特定提示
        throw error;
    }
    console.error('LUNA_WEB3_FATAL:', error);
    throw error;
  }
}