'use client';

import { useState } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { useFirestore, useUser } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Wallet,
  Image,
  Copy,
  ExternalLink,
  LogOut,
  Check,
  Settings,
  RefreshCw,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { formatWalletAddress } from '@/lib/avatarUtils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { getNftsForOwner, type SimplifiedNft } from '@/lib/alchemy';
import { NftSelectorDialog } from '@/components/nft-selector-dialog';
import { updateUserProfile } from '@/lib/user';

export function WalletDropdown() {
  const {
    account,
    connectWallet,
    disconnectWallet,
    boundWalletAddress,
    walletBindingStatus,
    walletBindingMessage,
  } = useWeb3();
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [copied, setCopied] = useState(false);
  const [isSyncingNfts, setIsSyncingNfts] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isNftDialogOpen, setIsNftDialogOpen] = useState(false);
  const [nfts, setNfts] = useState<SimplifiedNft[]>([]);

  if (!account) return null;

  const connectedWallet = account.toLowerCase();
  const boundWallet = boundWalletAddress?.toLowerCase() || null;
  const isMismatch = !!boundWallet && boundWallet !== connectedWallet;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(account);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Wallet address copied to clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    disconnectWallet();
    toast({
      title: 'Disconnected',
      description: 'Wallet disconnected successfully.',
    });
  };

  const handleSyncNfts = async () => {
    const walletForNft = boundWallet || profile?.walletAddress || connectedWallet;
    if (!walletForNft) {
      toast({
        variant: 'destructive',
        title: 'Wallet not available',
        description: 'Connect your wallet first.',
      });
      return;
    }

    if (!profile?.isWeb3Verified && !boundWallet) {
      toast({
        variant: 'destructive',
        title: 'Wallet not verified',
        description: 'Please complete wallet binding before verifying NFT assets.',
      });
      return;
    }

    setIsSyncingNfts(true);
    try {
      const ownerNfts = await getNftsForOwner(walletForNft);
      setNfts(ownerNfts);
      setIsNftDialogOpen(true);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Failed to sync NFTs',
        description: 'Could not fetch NFT data from your wallet.',
      });
    } finally {
      setIsSyncingNfts(false);
    }
  };

  const handleSetNftAvatar = async (nft: SimplifiedNft) => {
    if (!firestore || !user) return;
    setIsUpdatingAvatar(true);

    try {
      await updateUserProfile(firestore, user.uid, {
        photoURL: nft.imageUrl,
        avatarType: 'nft',
        nftAvatarUrl: nft.imageUrl,
        nftTokenId: nft.tokenId,
        nftContractAddress: nft.contractAddress,
        isNftVerified: true,
      });

      toast({
        title: 'Avatar Updated',
        description: 'Your profile picture is now your NFT.',
      });
      setIsNftDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not set NFT avatar.',
      });
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  return (
    <>
      <NftSelectorDialog
        open={isNftDialogOpen}
        onOpenChange={setIsNftDialogOpen}
        nfts={nfts}
        onSelect={handleSetNftAvatar}
        isUpdating={isUpdatingAvatar}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 sm:px-4 text-sm font-semibold text-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-200 hover:border-white/40 hover:bg-black/55">
            <Wallet className="h-4 w-4 text-white/70" />
            <span className="hidden md:inline text-white/75">Connected Wallet</span>
            <span className="text-white font-mono text-xs">{formatWalletAddress(account)}</span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-72 glass-morphism border-white/10" align="end">
          <DropdownMenuLabel className="font-normal space-y-2">
            <div>
              <p className="text-xs text-white/60">Connected Wallet</p>
              <p className="text-xs text-white font-mono break-all">{connectedWallet}</p>
            </div>

            <div>
              <p className="text-xs text-white/60">Bound Wallet</p>
              <p className="text-xs text-white font-mono break-all">{boundWallet || 'Not bound yet'}</p>
            </div>

            {isMismatch && (
              <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-2 py-1.5 text-[11px] text-yellow-300 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Connected wallet differs from bound wallet. Change request is required.</span>
              </div>
            )}

            {walletBindingMessage && (
              <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1.5 text-[11px] text-blue-200">
                {walletBindingMessage}
              </div>
            )}

            {walletBindingStatus === 'request_submitted' && (
              <div className="text-[11px] text-green-300">Wallet change request submitted for approval.</div>
            )}
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-white/10" />

          <DropdownMenuItem onClick={handleSyncNfts} className="cursor-pointer">
            {isSyncingNfts ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-purple-400" />
            ) : (
              <Image className="mr-2 h-4 w-4 text-purple-400" />
            )}
            <span className="font-medium">Set NFT Avatar</span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => connectWallet()} className="cursor-pointer">
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>Switch / Reconnect Wallet</span>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/account/wallet" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Wallet Management</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/10" />

          <DropdownMenuItem onClick={handleCopyAddress} className="cursor-pointer">
            {copied ? (
              <Check className="mr-2 h-4 w-4 text-green-400" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            <span>Copy Address</span>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <a
              href={`https://basescan.org/address/${account}`}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              <span>View on BaseScan</span>
            </a>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/10" />

          <DropdownMenuItem onClick={handleDisconnect} className="cursor-pointer text-red-400">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}



