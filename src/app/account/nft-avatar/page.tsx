'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFirestore, useUser } from '@/firebase';
import { useWeb3 } from '@/contexts/Web3Context';
import { updateUserProfile } from '@/lib/user';
import { getNftsForOwner, type SimplifiedNft } from '@/lib/alchemy';
import { NftSelectorDialog } from '@/components/nft-selector-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, Image as ImageIcon, Loader2, RefreshCw, Wallet, Link2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

function GlassCard({ children, className, delay = 0, accentColor = 'purple' }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  accentColor?: 'purple' | 'blue' | 'green' | 'yellow';
}) {
  const accents: Record<string, string> = {
    purple: 'via-purple-500/30',
    blue: 'via-blue-500/30',
    green: 'via-green-500/30',
    yellow: 'via-yellow-500/30',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn('relative', className)}
    >
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-white/[0.02] pointer-events-none" />
      <div className="relative bg-card/40 backdrop-blur-sm rounded-2xl border border-white/8 overflow-hidden">
        <div className={cn('h-px w-full bg-gradient-to-r from-transparent to-transparent', accents[accentColor])} />
        <div className="p-6">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

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
      toast({ variant: 'destructive', title: 'Wallet not available', description: 'Connect and bind a wallet before verifying NFT assets.' });
      return;
    }
    if (!profile?.isWeb3Verified && !boundWallet) {
      toast({ variant: 'destructive', title: 'Wallet not verified', description: 'Please complete wallet binding first.' });
      return;
    }

    setIsSyncing(true);
    try {
      const ownerNfts = await getNftsForOwner(walletForVerification);
      setNfts(ownerNfts);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Failed to verify NFT assets:', error);
      toast({ variant: 'destructive', title: 'NFT verification failed', description: 'Could not fetch NFTs from this wallet.' });
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
      toast({ title: 'NFT avatar updated', description: 'Your profile avatar is now set from your NFT asset.' });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to update NFT avatar:', error);
      toast({ variant: 'destructive', title: 'Update failed', description: 'Could not save NFT avatar to your profile.' });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative max-w-sm w-full text-center"
        >
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 pointer-events-none" />
          <div className="relative bg-card/50 backdrop-blur-sm rounded-2xl border border-white/8 p-8">
            <div className="p-4 rounded-2xl bg-yellow-500/15 border border-yellow-500/20 inline-flex mb-4">
              <AlertCircle className="h-8 w-8 text-yellow-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">请先登录</h2>
            <p className="text-muted-foreground/70 text-sm mb-6">您需要登录才能配置 NFT 头像。</p>
            <Link href="/auth/signin">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 border-0">登录</Button>
            </Link>
          </div>
        </motion.div>
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

      <div className="relative py-10 px-4 sm:px-6">
        {/* Background */}
        <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] bg-blue-600/6 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto max-w-3xl space-y-5">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-2"
          >
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
              <ImageIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent font-headline">
                NFT Avatar
              </h1>
              <p className="text-sm text-muted-foreground/70">Verify NFT assets from your wallet and set as avatar.</p>
            </div>
          </motion.div>

          {/* Wallet Status */}
          <GlassCard delay={0.1} accentColor="blue">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/20">
                <Link2 className="w-4 h-4 text-blue-400" />
              </div>
              <h2 className="font-semibold text-sm text-foreground">Wallet Status</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-3 mb-4">
              <div className="p-4 rounded-xl bg-background/40 border border-white/8">
                <p className="text-xs text-muted-foreground/60 mb-2">Connected Wallet</p>
                <p className="text-sm font-mono text-foreground/90 break-all">
                  {connectedWallet || <span className="text-muted-foreground/50 italic">Not connected</span>}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-background/40 border border-white/8">
                <p className="text-xs text-muted-foreground/60 mb-2">Bound Wallet</p>
                <p className="text-sm font-mono text-foreground/90 break-all">
                  {boundWallet || <span className="text-muted-foreground/50 italic">Not bound</span>}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline" className="text-xs border-white/15 text-muted-foreground/70">
                Web3 verified: {profile?.isWeb3Verified ? 'Yes' : 'No'}
              </Badge>
              {isMismatch && (
                <Badge className="bg-orange-500/15 text-orange-300 border-orange-500/25 text-xs">
                  Connected wallet differs from bound wallet
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {!connectedWallet && (
                <Button
                  onClick={connectWallet}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0 shadow-[0_0_15px_rgba(59,130,246,0.25)]"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Connect Wallet
                </Button>
              )}
              <Button
                onClick={handleVerifyNfts}
                disabled={isSyncing || isUpdating || !walletForVerification}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
              >
                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                Verify NFT Assets
              </Button>
              <Link href="/account/wallet">
                <Button variant="outline" className="border-white/15 hover:bg-white/5">
                  <Wallet className="h-4 w-4 mr-2" />
                  Wallet Management
                </Button>
              </Link>
            </div>
          </GlassCard>

          {/* Current NFT Avatar */}
          {profile?.avatarType === 'nft' && profile?.nftAvatarUrl ? (
            <GlassCard delay={0.2} accentColor="green">
              <div className="flex flex-wrap items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.nftAvatarUrl}
                  alt="Current NFT avatar"
                  className="h-20 w-20 rounded-xl object-cover border border-green-500/30"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <p className="text-green-300 font-semibold text-sm">Current NFT Avatar</p>
                  </div>
                  <p className="text-xs text-muted-foreground/50 break-all">Token ID: {profile.nftTokenId || '-'}</p>
                </div>
              </div>
            </GlassCard>
          ) : (
            <GlassCard delay={0.2} accentColor="purple">
              <div className="text-center py-6">
                <div className="p-4 bg-white/5 rounded-2xl inline-flex mb-3 border border-white/8">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground/60 text-sm">No NFT avatar selected yet.</p>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </>
  );
}
