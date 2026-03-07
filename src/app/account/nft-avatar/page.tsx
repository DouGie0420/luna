'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFirestore, useUser } from '@/firebase';
import { useWeb3 } from '@/contexts/Web3Context';
import { updateUserProfile } from '@/lib/user';
import { getNftsForOwner, type SimplifiedNft } from '@/lib/alchemy';
import { NftSelectorDialog } from '@/components/nft-selector-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, Image as ImageIcon, Loader2, RefreshCw, Wallet } from 'lucide-react';

export default function NftAvatarPage() {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { account, connectWallet, boundWalletAddress } = useWeb3();
  const { toast } = useToast();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [nfts, setNfts] = useState<SimplifiedNft[]>([]);

  const connectedWallet = account?.toLowerCase() || null;
  const boundWallet = boundWalletAddress || profile?.walletAddress?.toLowerCase() || null;
  const walletForVerification = boundWallet || connectedWallet;
  const isMismatch = !!connectedWallet && !!boundWallet && connectedWallet !== boundWallet;

  const handleVerifyNfts = async () => {
    if (!walletForVerification) {
      toast({
        variant: 'destructive',
        title: 'Wallet not available',
        description: 'Connect and bind a wallet before verifying NFT assets.',
      });
      return;
    }

    if (!profile?.isWeb3Verified && !boundWallet) {
      toast({
        variant: 'destructive',
        title: 'Wallet not verified',
        description: 'Please complete wallet binding first.',
      });
      return;
    }

    setIsSyncing(true);

    try {
      const ownerNfts = await getNftsForOwner(walletForVerification);
      setNfts(ownerNfts);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Failed to verify NFT assets:', error);
      toast({
        variant: 'destructive',
        title: 'NFT verification failed',
        description: 'Could not fetch NFTs from this wallet.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectNft = async (nft: SimplifiedNft) => {
    if (!firestore || !user) return;

    setIsUpdating(true);

    try {
      await updateUserProfile(firestore, user.uid, {
        avatarType: 'nft',
        photoURL: nft.imageUrl,
        nftAvatarUrl: nft.imageUrl,
        nftTokenId: nft.tokenId,
        nftContractAddress: nft.contractAddress,
        isNftVerified: true,
      });

      toast({
        title: 'NFT avatar updated',
        description: 'Your profile avatar is now set from your NFT asset.',
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to update NFT avatar:', error);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not save NFT avatar to your profile.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <Card className="glass-morphism border-white/10 p-8 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Please Sign In</h2>
          <p className="text-white/60 mb-6">You need to sign in to configure NFT avatar.</p>
          <Link href="/auth/signin">
            <Button className="bg-gradient-to-r from-primary to-secondary">Sign In</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <>
      <NftSelectorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        nfts={nfts}
        onSelect={handleSelectNft}
        isUpdating={isUpdating}
      />

      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-gradient mb-2">NFT Avatar</h1>
            <p className="text-white/60">Verify NFT assets from your bound wallet and set one as avatar.</p>
          </div>

          <Card className="glass-morphism border-white/10 p-6 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Wallet Status
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60 mb-1">Connected Wallet</p>
                <p className="text-white font-mono break-all text-xs">{connectedWallet || 'Not connected'}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60 mb-1">Bound Wallet</p>
                <p className="text-white font-mono break-all text-xs">{boundWallet || 'Not bound yet'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-white/30 text-white/80">
                Web3 verified: {profile?.isWeb3Verified ? 'Yes' : 'No'}
              </Badge>
              {isMismatch ? (
                <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/40">
                  Connected wallet differs from bound wallet
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              {!connectedWallet ? (
                <Button onClick={connectWallet} className="bg-gradient-to-r from-primary to-secondary">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Connect Wallet
                </Button>
              ) : null}

              <Button
                onClick={handleVerifyNfts}
                disabled={isSyncing || isUpdating || !walletForVerification}
                className="bg-gradient-to-r from-primary to-secondary"
              >
                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                Verify NFT Assets
              </Button>

              <Link href="/account/wallet">
                <Button variant="outline">Wallet Management</Button>
              </Link>
            </div>
          </Card>

          {profile?.avatarType === 'nft' && profile?.nftAvatarUrl ? (
            <Card className="glass-morphism border-green-500/30 bg-green-500/5 p-6">
              <div className="flex flex-wrap items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.nftAvatarUrl}
                  alt="Current NFT avatar"
                  className="h-20 w-20 rounded-lg object-cover border border-green-500/40"
                />
                <div>
                  <p className="text-green-300 font-semibold">Current NFT Avatar</p>
                  <p className="text-sm text-white/60 break-all">Token ID: {profile.nftTokenId || '-'}</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-green-400 ml-auto" />
              </div>
            </Card>
          ) : (
            <Card className="glass-morphism border-white/10 p-10 text-center">
              <ImageIcon className="h-12 w-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/70">No NFT avatar selected yet.</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
