/**
 * ============================================================
 * 月壤AI微宇宙 - NFT验证系统
 * ============================================================
 * 使用 Alchemy SDK 验证用户是否持有指定NFT
 * 用于DJ模式门禁
 */

import { Network, Alchemy } from 'alchemy-sdk';
import { LUNA_NFT_CONTRACT, LUNA_NFT_CHAIN } from './constants';

// 初始化Alchemy SDK
function createAlchemyInstance() {
  // 注意：需要环境变量 NEXT_PUBLIC_ALCHEMY_API_KEY
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

  if (!apiKey) {
    console.warn('[NFT Verification] Alchemy API key not found. Using mock validation for development.');
    return null;
  }

  const settings = {
    apiKey,
    network: Network.ETH_MAINNET,
  };

  return new Alchemy(settings);
}

/**
 * 验证钱包是否持有指定NFT
 * @param walletAddress 以太坊钱包地址
 * @returns 验证结果
 */
export async function verifyNFT(walletAddress: string): Promise<{
  valid: boolean;
  tokenIds?: string[];
  nfts?: Array<{
    contract: { address: string };
    tokenId: string;
    name?: string;
    description?: string;
    image?: { originalUrl?: string };
  }>;
  error?: string;
}> {
  try {
    // 格式验证
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return { valid: false, error: 'Invalid wallet address format' };
    }

    const alchemy = createAlchemyInstance();

    // 开发环境模拟
    if (!alchemy) {
      console.log('[NFT Verification] Development mode: Simulating NFT ownership for testing.');
      return {
        valid: true,
        tokenIds: ['0'],
        nfts: [
          {
            contract: { address: LUNA_NFT_CONTRACT },
            tokenId: '0',
            name: 'Luna NFT (Test)',
            description: 'Test NFT for development',
            image: { originalUrl: 'https://example.com/test-nft.png' },
          },
        ],
      };
    }

    // 调用Alchemy API检查NFT持有情况
    const response = await alchemy.nft.getNftsForOwner(walletAddress, {
      contractAddresses: [LUNA_NFT_CONTRACT],
    });

    if (!response.ownedNfts || response.ownedNfts.length === 0) {
      return { valid: false };
    }

    const validNfts = response.ownedNfts.filter(nft =>
      nft.contract.address.toLowerCase() === LUNA_NFT_CONTRACT.toLowerCase()
    );

    if (validNfts.length === 0) {
      return { valid: false };
    }

    const tokenIds = validNfts.map(nft => nft.tokenId);

    return {
      valid: true,
      tokenIds,
      nfts: validNfts.map(nft => ({
        contract: { address: nft.contract.address },
        tokenId: nft.tokenId,
        name: nft.name,
        description: nft.description,
        image: nft.image,
      })),
    };

  } catch (error: any) {
    console.error('[NFT Verification Error]', error);
    return {
      valid: false,
      error: error.message || 'NFT verification failed',
    };
  }
}

/**
 * 获取NFT的元数据（图片、名称、属性等）
 * @param contractAddress NFT合约地址
 * @param tokenId Token ID
 * @returns NFT元数据
 */
export async function getNFTMetadata(contractAddress: string, tokenId: string): Promise<{
  success: boolean;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{ trait_type: string; value: string }>;
  };
  error?: string;
}> {
  try {
    const alchemy = createAlchemyInstance();

    if (!alchemy) {
      // 开发环境模拟
      return {
        success: true,
        metadata: {
          name: 'Test NFT #' + tokenId,
          description: 'A test NFT for development',
          image: 'https://example.com/test-nft.png',
          attributes: [
            { trait_type: 'Type', value: 'Test' },
            { trait_type: 'Rarity', value: 'Common' },
          ],
        },
      };
    }

    const response = await alchemy.nft.getNftMetadata(contractAddress, tokenId);

    return {
      success: true,
      metadata: {
        name: response.name,
        description: response.description,
        image: response.image?.originalUrl,
        // Alchemy SDK 的 attributes 类型与我们的不同，进行类型转换
        attributes: (response.raw?.metadata?.attributes as Array<{ trait_type: string; value: string }>) || [],
      },
    };

  } catch (error: any) {
    console.error('[NFT Metadata Error]', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch NFT metadata',
    };
  }
}

/**
 * 将NFT图像像素化（简化版）
 * @param imageUrl NFT图像URL
 * @returns 像素化后的数据（基础64色表示）
 */
export async function pixelateNFT(imageUrl: string): Promise<{
  success: boolean;
  pixelData?: {
    width: number;
    height: number;
    colors: string[]; // 16色调色板索引
  };
  error?: string;
}> {
  try {
    // 注意：在浏览器环境中，这将在客户端使用Canvas API完成
    // 这里只是返回一个模拟数据
    return {
      success: true,
      pixelData: {
        width: 32,
        height: 32,
        colors: Array(32 * 32).fill(0).map(() => String(Math.floor(Math.random() * 16))),
      },
    };
  } catch (error: any) {
    console.error('[NFT Pixelation Error]', error);
    return {
      success: false,
      error: error.message || 'Pixelation failed',
    };
  }
}