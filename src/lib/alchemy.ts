'use client';

export interface SimplifiedNft {
    name: string;
    imageUrl: string;
    tokenId: string;
    contractAddress: string;
    chain?: string;
}

const normalizeImageUrl = (url: string | undefined): string => {
    if (!url || typeof url !== 'string') return '';

    if (url.startsWith('ipfs://')) {
        return `https://ipfs.io/ipfs/${url.substring(7)}`;
    }
    if (url.startsWith('ar://')) {
        return `https://arweave.net/${url.substring(5)}`;
    }
    if (url.startsWith('//')) {
        return `https:${url}`;
    }
    if (!url.startsWith('http') && !url.startsWith('data:image')) {
        return '';
    }
    return url;
};

// Chains to query — covers ETH, Polygon, Base, Optimism
const CHAINS = [
    { id: 'eth-mainnet', label: 'ETH' },
    { id: 'polygon-mainnet', label: 'Polygon' },
    { id: 'base-mainnet', label: 'Base' },
    { id: 'opt-mainnet', label: 'Optimism' },
];

const fetchNftsForChain = async (
    apiKey: string,
    owner: string,
    chain: { id: string; label: string }
): Promise<SimplifiedNft[]> => {
    const url = `https://${chain.id}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner?owner=${encodeURIComponent(owner)}&withMetadata=true&pageSize=50`;

    const res = await fetch(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const ownedNfts: any[] = data.ownedNfts || [];

    return ownedNfts
        .map((nft: any) => {
            const rawUrl =
                nft.image?.cachedUrl ||
                nft.image?.pngUrl ||
                nft.image?.thumbnailUrl ||
                nft.image?.originalUrl ||
                nft.image?.url;

            const imageUrl = normalizeImageUrl(rawUrl);
            if (!imageUrl) return null;

            return {
                name: nft.name || nft.title || `#${nft.tokenId}`,
                imageUrl,
                tokenId: nft.tokenId,
                contractAddress: nft.contract?.address || '',
                chain: chain.label,
            };
        })
        .filter((nft): nft is SimplifiedNft => nft !== null);
};

export const getNftsForOwner = async (ownerAddress: string): Promise<SimplifiedNft[]> => {
    const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (!apiKey) {
        throw new Error('Alchemy API key is missing.');
    }

    // Query all chains in parallel, silently ignore per-chain failures
    const results = await Promise.allSettled(
        CHAINS.map(chain => fetchNftsForChain(apiKey, ownerAddress, chain))
    );

    const allNfts: SimplifiedNft[] = [];
    for (const result of results) {
        if (result.status === 'fulfilled') {
            allNfts.push(...result.value);
        }
    }

    return allNfts;
};
