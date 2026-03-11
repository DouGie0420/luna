'use client';

import { Alchemy, Network, NftFilters } from 'alchemy-sdk';

// 🚀 升级版 IPFS 极速网关与 URL 格式化
const normalizeImageUrl = (url: string | undefined): string => {
    if (!url || typeof url !== 'string') return '';
    
    if (url.startsWith('ipfs://')) {
        // 使用 Cloudflare 的全球 CDN 节点，比官方 ipfs.io 快至少 5 倍
        return `https://cloudflare-ipfs.com/ipfs/${url.substring(7)}`;
    }

    if (url.startsWith('ar://')) {
        return `https://arweave.net/${url.substring(5)}`;
    }

    if (url.startsWith('//')) {
        return `https:${url}`;
    }
    
    if (!url.startsWith('http')) {
        if (url.startsWith('data:image')) {
            return url;
        }
        return '';
    }

    return url;
};

// 🚀 自动回退机制：如果没有配置 Key，默认使用官方公共演示通道
const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "demo";

const config = {
    apiKey: apiKey, 
    network: Network.ETH_MAINNET, // 死死锁定以太坊主网，确保能抓到高价值头像
};

if (process.env.NODE_ENV === 'development' && apiKey === "demo") {
    console.warn("⚠️ 警告: 未检测到专属 Alchemy API Key，当前正在使用公共限速通道。建议在 .env 中配置 NEXT_PUBLIC_ALCHEMY_API_KEY。");
}

const alchemy = new Alchemy(config);

export interface SimplifiedNft {
    name: string;
    imageUrl: string;
    tokenId: string;
    contractAddress: string;
}

export const getNftsForOwner = async (ownerAddress: string): Promise<SimplifiedNft[]> => {
    try {
        // 🚀 核心升级：增加 excludeFilters，自动屏蔽主网海量的诈骗/垃圾空投 NFT
        const nfts = await alchemy.nft.getNftsForOwner(ownerAddress, {
            excludeFilters: [NftFilters.SPAM],
        });

        const simplifiedNfts = nfts.ownedNfts
            .map(nft => {
                // 智能匹配最佳画质
                const rawUrl = nft.image?.cachedUrl 
                             || nft.image?.pngUrl
                             || nft.image?.thumbnailUrl
                             || nft.image?.originalUrl 
                             || (nft.media?.[0]?.gateway)
                             || (nft.media?.[0]?.thumbnail)
                             || (nft.media?.[0]?.raw);

                const imageUrl = normalizeImageUrl(rawUrl);

                if (!imageUrl || (!imageUrl.startsWith('https://') && !imageUrl.startsWith('http://') && !imageUrl.startsWith('data:image'))) {
                    return null;
                }

                return {
                    name: nft.name || `#${nft.tokenId}`,
                    imageUrl: imageUrl,
                    tokenId: nft.tokenId,
                    contractAddress: nft.contract.address,
                };
            })
            .filter((nft): nft is SimplifiedNft => nft !== null);

        return simplifiedNfts;

    } catch (error) {
        console.error("Alchemy 节点抓取失败:", error);
        throw new Error("无法从以太坊主网同步数据，请检查网络环境或节点连接。");
    }
};