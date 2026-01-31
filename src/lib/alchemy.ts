'use client';
import { Alchemy, Network, Nft } from 'alchemy-sdk';

// Basic IPFS gateway resolver
const resolveIpfsUrl = (url: string | undefined): string => {
    if (!url) return '';
    if (url.startsWith('ipfs://')) {
        return `https://ipfs.io/ipfs/${url.substring(7)}`;
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
        throw new Error("Alchemy API key is missing. Please check your application's environment variables.");
    }
    try {
        const nfts = await alchemy.nft.getNftsForOwner(ownerAddress);

        const simplifiedNfts = nfts.ownedNfts
            .map(nft => {
                // Find the best available image URL from various possible sources.
                const imageUrl = nft.image?.cachedUrl 
                             || nft.image?.pngUrl
                             || nft.image?.originalUrl 
                             || (nft.media?.[0]?.gateway)
                             || (nft.media?.[0]?.raw ? resolveIpfsUrl(nft.media[0].raw) : undefined);

                if (!imageUrl) {
                    return null; // No usable image found for this NFT, so we'll filter it out.
                }

                return {
                    name: nft.name || `#${nft.tokenId}`,
                    imageUrl: resolveIpfsUrl(imageUrl),
                    tokenId: nft.tokenId,
                    contractAddress: nft.contract.address,
                };
            })
            .filter((nft): nft is SimplifiedNft => nft !== null); // Filter out the nulls.

        return simplifiedNfts;

    } catch (error) {
        console.error("Error fetching NFTs from Alchemy:", error);
        // Provide a more user-friendly error message
        throw new Error("Failed to fetch NFT data from Alchemy. The API key might be invalid or there could be a network issue.");
    }
};
