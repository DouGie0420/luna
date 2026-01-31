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

if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
    console.warn("Alchemy API key not found. Please set NEXT_PUBLIC_ALCHEMY_API_KEY in your .env file.");
}

const config = {
    apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "", 
    network: Network.ETH_MAINNET, 
};
const alchemy = new Alchemy(config);

export interface SimplifiedNft {
    name: string;
    imageUrl: string;
    tokenId: string;
    contractAddress: string;
}

export const getNftsForOwner = async (ownerAddress: string): Promise<SimplifiedNft[]> => {
    if (!config.apiKey) {
        throw new Error("Alchemy API key is missing. Please check your .env file.");
    }
    try {
        const nfts = await alchemy.nft.getNftsForOwner(ownerAddress);
        return nfts.ownedNfts
            .filter(nft => nft.media && nft.media.length > 0 && nft.media[0].gateway)
            .map(nft => ({
                name: nft.name || `#${nft.tokenId}`,
                imageUrl: resolveIpfsUrl(nft.media[0].gateway),
                tokenId: nft.tokenId,
                contractAddress: nft.contract.address,
            }));
    } catch (error) {
        console.error("Error fetching NFTs from Alchemy:", error);
        throw new Error("Failed to fetch NFT data from Alchemy. Please check your API key and network connection.");
    }
};
