'use client';

import { useState } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';
import { useUser } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, Image, Copy, ExternalLink, LogOut, Check, Settings } from 'lucide-react';
import { formatWalletAddress } from '@/lib/avatarUtils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export function WalletDropdown() {
  const { account, disconnectWallet } = useWeb3();
  const { user } = useUser();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!account) return null;

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative group">
          <div className="absolute -inset-2 bg-green-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative px-4 py-2 rounded-full transition-all duration-200 flex items-center gap-2 glass-morphism bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 hover:border-green-500/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            <Wallet className="h-4 w-4 text-green-400" />
            <span className="text-green-400 font-medium text-sm">{formatWalletAddress(account)}</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 glass-morphism border-white/10" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-white">Connected Wallet</p>
            <p className="text-xs text-white/60 font-mono">{account}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        
        {/* 设置NFT头像 - 突出显示 */}
        <DropdownMenuItem asChild>
          <Link href="/account/nft-avatar" className="cursor-pointer bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-l-2 border-l-purple-500">
            <Image className="mr-2 h-4 w-4 text-purple-400" />
            <span className="font-medium">Set NFT Avatar</span>
          </Link>
        </DropdownMenuItem>
        
        {/* 钱包管理 */}
        <DropdownMenuItem asChild>
          <Link href="/account/wallet" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Wallet Management</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-white/10" />
        
        {/* 复制地址 */}
        <DropdownMenuItem onClick={handleCopyAddress} className="cursor-pointer">
          {copied ? (
            <Check className="mr-2 h-4 w-4 text-green-400" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          <span>Copy Address</span>
        </DropdownMenuItem>
        
        {/* 在区块浏览器查看 */}
        <DropdownMenuItem asChild>
          <a
            href={`https://tronscan.org/#/address/${account}`}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            <span>View on TronScan</span>
          </a>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-white/10" />
        
        {/* 断开连接 */}
        <DropdownMenuItem onClick={handleDisconnect} className="cursor-pointer text-red-400">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
