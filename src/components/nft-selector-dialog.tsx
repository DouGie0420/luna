'use client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import Image from 'next/image';
import { SimplifiedNft } from '@/lib/alchemy';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { Loader2 } from 'lucide-react';

interface NftSelectorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nfts: SimplifiedNft[];
    onSelect: (nft: SimplifiedNft) => void;
    isUpdating: boolean;
}

export function NftSelectorDialog({ open, onOpenChange, nfts, onSelect, isUpdating }: NftSelectorDialogProps) {
    const [selectedNft, setSelectedNft] = useState<SimplifiedNft | null>(null);
    const { t } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Select Your NFT Avatar</DialogTitle>
                    <DialogDescription>Choose an NFT from your wallet to use as your profile picture.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96 pr-6">
                    {nfts.length === 0 ? (
                        <p className="text-muted-foreground text-center">No NFTs found in your wallet.</p>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                            {nfts.map((nft) => (
                                <div
                                    key={`${nft.contractAddress}-${nft.tokenId}`}
                                    className={cn(
                                        "relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                                        selectedNft?.tokenId === nft.tokenId ? "border-primary ring-2 ring-primary" : "border-transparent hover:border-primary/50"
                                    )}
                                    onClick={() => setSelectedNft(nft)}
                                >
                                    <Image src={nft.imageUrl} alt={nft.name} fill className="object-cover" />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1">
                                        <p className="text-white text-xs truncate">{nft.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <DialogFooter>
                    <Button
                        onClick={() => selectedNft && onSelect(selectedNft)}
                        disabled={!selectedNft || isUpdating}
                    >
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Set as Avatar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
