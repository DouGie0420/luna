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

const config = {
    apiKey: "i2W8Dk47iLGaEhcRcwkFI",
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
