'use client';
import { Alchemy, Network, Nft } from 'alchemy-sdk';

// More robust IPFS gateway resolver and URL normalizer
const normalizeImageUrl = (url: string | undefined): string => {
    if (!url || typeof url !== 'string') return '';
    
    if (url.startsWith('ipfs://')) {
        // Use a reliable public IPFS gateway
        return `https://ipfs.io/ipfs/${url.substring(7)}`;
    }

    if (url.startsWith('ar://')) {
        // Arweave gateway
        return `https://arweave.net/${url.substring(5)}`;
    }

    // If a URL is protocol-relative, prepend https
    if (url.startsWith('//')) {
        return `https:${url}`;
    }
    
    // next/image requires absolute URLs. If we just have a path, we can't use it.
    if (!url.startsWith('http')) {
        // This might be a base64 data URI, which is fine.
        if (url.startsWith('data:image')) {
            return url;
        }
        // Otherwise, it's an unusable relative path or garbage data.
        return '';
    }

    return url;
};


// Reading the API key from environment variables
const config = {
    apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "", 
    network: Network.ETH_MAINNET, 
};

// Warn in development if the key is missing
if (process.env.NODE_ENV === 'development' && !config.apiKey) {
    console.warn("Alchemy API key not found. Please set NEXT_PUBLIC_ALCHEMY_API_KEY in your .env file.");
}

const alchemy = new Alchemy(config);

export interface SimplifiedNft {
    name: string;
    imageUrl: string;
    tokenId: string;
    contractAddress: string;
}

export const getNftsForOwner = async (ownerAddress: string): Promise<SimplifiedNft[]> => {
    if (!config.apiKey) {
        throw new Error("Alchemy API key is missing. Please provide it in your .env file.");
    }
    try {
        const nfts = await alchemy.nft.getNftsForOwner(ownerAddress);

        const simplifiedNfts = nfts.ownedNfts
            .map(nft => {
                // Find the best available image URL from various possible sources.
                const rawUrl = nft.image?.cachedUrl 
                             || nft.image?.pngUrl
                             || nft.image?.thumbnailUrl
                             || nft.image?.originalUrl 
                             || (nft.media?.[0]?.gateway)
                             || (nft.media?.[0]?.thumbnail)
                             || (nft.media?.[0]?.raw);

                const imageUrl = normalizeImageUrl(rawUrl);

                // If after normalization, we don't have a valid, absolute URL, skip this NFT.
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
        console.error("Error fetching NFTs from Alchemy:", error);
        // Provide a more user-friendly error message
        throw new Error("Failed to fetch NFT data. The API key might be invalid or there could be a network issue.");
    }
};
