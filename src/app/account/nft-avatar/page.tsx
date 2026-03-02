'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useWeb3 } from '@/contexts/Web3Context';
import { doc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface NFT {
  tokenId: string;
  contractAddress: string;
  name: string;
  imageUrl: string;
  collection: string;
}

export default function NFTAvatarPage() {
  const { user, profile } = useUser();
  const { account, connectWallet } = useWeb3();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingAvatar, setIsSettingAvatar] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);

  // 获取用户的NFT
  useEffect(() => {
    if (!account) return;

    const fetchNFTs = async () => {
      setIsLoading(true);
      try {
        // TODO: 实现真实的NFT获取逻辑
        // 这里使用模拟数据
        const mockNFTs: NFT[] = [
          {
            tokenId: '1',
            contractAddress: '0x1234567890abcdef',
            name: 'Cool NFT #1',
            imageUrl: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=nft1',
            collection: 'Cool Collection'
          },
          {
            tokenId: '2',
            contractAddress: '0x1234567890abcdef',
            name: 'Cool NFT #2',
            imageUrl: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=nft2',
            collection: 'Cool Collection'
          },
          {
            tokenId: '3',
            contractAddress: '0x1234567890abcdef',
            name: 'Cool NFT #3',
            imageUrl: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=nft3',
            collection: 'Cool Collection'
          }
        ];

        setNfts(mockNFTs);
      } catch (error) {
        console.error('Error fetching NFTs:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch your NFTs.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFTs();
  }, [account, toast]);

  const handleSetAvatar = async () => {
    if (!selectedNFT || !user || !firestore) return;

    setIsSettingAvatar(true);

    try {
      const userRef = doc(firestore, 'users', user.uid);
      
      await updateDoc(userRef, {
        avatarType: 'nft',
        nftAvatarUrl: selectedNFT.imageUrl,
        nftTokenId: selectedNFT.tokenId,
        nftContractAddress: selectedNFT.contractAddress,
        photoURL: selectedNFT.imageUrl,
        badges: arrayUnion('NFT'),
        updatedAt: serverTimestamp()
      });

      toast({
        title: 'Success!',
        description: 'Your NFT avatar has been set. NFT badge awarded!',
      });

      router.push('/account/profile');
    } catch (error) {
      console.error('Error setting NFT avatar:', error);
      toast({
        title: 'Error',
        description: 'Failed to set NFT avatar. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSettingAvatar(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <Card className="glass-morphism border-white/10 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Please Sign In</h2>
          <p className="text-white/60 mb-6">You need to sign in to set your NFT avatar.</p>
          <Link href="/auth/signin">
            <Button className="bg-gradient-to-r from-primary to-secondary">
              Sign In
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <Card className="glass-morphism border-white/10 p-8 text-center max-w-md">
          <ImageIcon className="h-12 w-12 text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-white/60 mb-6">
            Connect your Web3 wallet to view and select your NFTs as avatar.
          </p>
          <Button
            onClick={connectWallet}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            Connect Wallet
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-2">Set NFT Avatar</h1>
          <p className="text-white/60">
            Select one of your NFTs to use as your profile avatar
          </p>
        </div>

        {/* Current Avatar */}
        {profile?.avatarType === 'nft' && (
          <Card className="glass-morphism border-primary/30 p-6 mb-8 bg-primary/5">
            <div className="flex items-center gap-4">
              <img
                src={profile.nftAvatarUrl}
                alt="Current NFT Avatar"
                className="w-20 h-20 rounded-lg border-2 border-primary"
              />
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Current NFT Avatar</h3>
                <p className="text-sm text-white/60">
                  Token ID: {profile.nftTokenId}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-400 ml-auto" />
            </div>
          </Card>
        )}

        {/* NFT Gallery */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <span className="ml-4 text-white/60">Loading your NFTs...</span>
          </div>
        ) : nfts.length === 0 ? (
          <Card className="glass-morphism border-white/10 p-12 text-center">
            <ImageIcon className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">No NFTs Found</h3>
            <p className="text-white/60 mb-6">
              You don't have any NFTs in your wallet yet.
            </p>
            <a
              href="https://opensea.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Browse NFTs on OpenSea →
            </a>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {nfts.map((nft) => (
                <Card
                  key={`${nft.contractAddress}-${nft.tokenId}`}
                  onClick={() => setSelectedNFT(nft)}
                  className={`glass-morphism border cursor-pointer transition-all duration-200 hover:scale-105 ${
                    selectedNFT?.tokenId === nft.tokenId
                      ? 'border-primary shadow-[0_0_20px_rgba(255,0,255,0.3)]'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={nft.imageUrl}
                      alt={nft.name}
                      className="w-full aspect-square object-cover rounded-t-lg"
                    />
                    {selectedNFT?.tokenId === nft.tokenId && (
                      <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-white text-sm truncate">{nft.name}</h4>
                    <p className="text-xs text-white/60 truncate">{nft.collection}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            {selectedNFT && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                <Card className="glass-morphism border-primary/30 p-4 bg-black/80 backdrop-blur-xl">
                  <div className="flex items-center gap-4">
                    <img
                      src={selectedNFT.imageUrl}
                      alt={selectedNFT.name}
                      className="w-12 h-12 rounded-lg border border-primary"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{selectedNFT.name}</p>
                      <p className="text-xs text-white/60">Selected</p>
                    </div>
                    <Button
                      onClick={handleSetAvatar}
                      disabled={isSettingAvatar}
                      className="bg-gradient-to-r from-primary to-secondary"
                    >
                      {isSettingAvatar ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Setting...
                        </>
                      ) : (
                        'Set as Avatar'
                      )}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
