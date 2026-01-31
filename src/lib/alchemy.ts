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

// Check if Alchemy API key is provided
if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
    console.warn("Alchemy API Key is not configured. Please add NEXT_PUBLIC_ALCHEMY_API_KEY to your .env file.");
}

const config = {
    apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "",
    network: Network.ETH_MAINNET, // You can make this configurable
};
const alchemy = new Alchemy(config);

export interface SimplifiedNft {
    name: string;
    imageUrl: string;
    tokenId: string;
    contractAddress: string;
}

export const getNftsForOwner = async (ownerAddress: string): Promise<SimplifiedNft[]> => {
    if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
        // Return mock data if API key is not set
        console.log("Using mock NFT data because Alchemy API key is not set.");
        return [
            { name: "Cyber Punk #1234", imageUrl: "https://picsum.photos/seed/nft1/500/500", tokenId: "1234", contractAddress: "0xabc" },
            { name: "Neon District", imageUrl: "https://picsum.photos/seed/nft2/500/500", tokenId: "5678", contractAddress: "0xdef" },
            { name: "Glitch Face", imageUrl: "https://picsum.photos/seed/nft3/500/500", tokenId: "9012", contractAddress: "0xghi" },
        ];
    }

    try {
        const nfts = await alchemy.nft.getNftsForOwner(ownerAddress);
        return nfts.ownedNfts
            .filter(nft => nft.media.length > 0 && nft.media[0].gateway)
            .map(nft => ({
                name: nft.name || `#${nft.tokenId}`,
                imageUrl: resolveIpfsUrl(nft.media[0].gateway),
                tokenId: nft.tokenId,
                contractAddress: nft.contract.address,
            }));
    } catch (error) {
        console.error("Error fetching NFTs from Alchemy:", error);
        return [];
    }
};
