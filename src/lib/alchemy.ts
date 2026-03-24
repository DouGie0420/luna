'use client';
import { Alchemy, Network } from 'alchemy-sdk';

const normalizeImageUrl = (url: string | undefined): string => {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${url.substring(7)}`;
    if (url.startsWith('ar://')) return `https://arweave.net/${url.substring(5)}`;
    if (url.startsWith('//')) return `https:${url}`;
    if (!url.startsWith('http') && !url.startsWith('data:image')) return '';
    return url;
};

export interface SimplifiedNft {
    name: string;
    imageUrl: string;
    tokenId: string;
    contractAddress: string;
    chain?: string;
}

const API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '';

// 多链配置
const CHAIN_CONFIGS = [
    { network: Network.ETH_MAINNET,     label: 'ETH' },
    { network: Network.MATIC_MAINNET,   label: 'Polygon' },
    { network: Network.BASE_MAINNET,    label: 'Base' },
    { network: Network.OPT_MAINNET,     label: 'Optimism' },
];

const getNftsForChain = async (
    ownerAddress: string,
    network: Network,
    label: string
): Promise<SimplifiedNft[]> => {
    const alchemy = new Alchemy({ apiKey: API_KEY, network });
    const result = await alchemy.nft.getNftsForOwner(ownerAddress);

    return result.ownedNfts
        .map(nft => {
            const rawUrl =
                nft.image?.cachedUrl ||
                nft.image?.pngUrl ||
                nft.image?.thumbnailUrl ||
                nft.image?.originalUrl ||
                (nft as any).media?.[0]?.gateway ||
                (nft as any).media?.[0]?.thumbnail;
            const imageUrl = normalizeImageUrl(rawUrl);
            if (!imageUrl) return null;
            return {
                name: nft.name || `#${nft.tokenId}`,
                imageUrl,
                tokenId: nft.tokenId,
                contractAddress: nft.contract.address,
                chain: label,
            };
        })
        .filter((nft): nft is SimplifiedNft => nft !== null);
};

export const getNftsForOwner = async (ownerAddress: string): Promise<SimplifiedNft[]> => {
    if (!API_KEY) throw new Error('Alchemy API key is missing.');

    // 并行查询所有链，单链失败不影响其他链
    const results = await Promise.allSettled(
        CHAIN_CONFIGS.map(({ network, label }) => getNftsForChain(ownerAddress, network, label))
    );

    const allNfts: SimplifiedNft[] = [];
    for (const result of results) {
        if (result.status === 'fulfilled') allNfts.push(...result.value);
    }
    return allNfts;
};
