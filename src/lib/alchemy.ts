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
        return nfts.ownedNfts
            // FIX: Check if nft.media exists and is an array with content before filtering
            .filter(nft => nft.media && nft.media.length > 0 && nft.media[0].gateway)
            .map(nft => ({
                name: nft.name || `#${nft.tokenId}`,
                // FIX: Added another check here for robustness
                imageUrl: resolveIpfsUrl(nft.media?.[0]?.gateway),
                tokenId: nft.tokenId,
                contractAddress: nft.contract.address,
            }));
    } catch (error) {
        console.error("Error fetching NFTs from Alchemy:", error);
        throw new Error("Failed to fetch NFT data from Alchemy. Please check your API key and network connection.");
    }
};
