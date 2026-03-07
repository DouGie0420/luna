'use client';
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useUSDTBalanceAndAllowance } from '@/hooks/useUSDTBalanceAndAllowance';
import { formatUnits, BigNumberish, ethers } from 'ethers'; // 引入 ethers 用于 BigInt
// 🚀 核心修复：在这里加上了 DropdownMenuSeparator 的导入
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { LogOut, Wallet, Diamond, Loader2, QrCode, Smartphone } from 'lucide-react'; // 引入 Loader2
import { getEthersSigner, connectToChain } from '@/lib/web3-provider'; // 引入新的Web3工具函数
import { useToast } from '@/hooks/use-toast'; // 引入 useToast Hook
import { connectWalletConnect, disconnectWalletConnect, isWalletConnectConnected } from '@/lib/walletconnect-provider'; // WalletConnect 集成

// 定义Luna项目所需的Polygon链ID，与web3-provider.ts保持一致
const REQUIRED_CHAIN_ID = 84532;

export function ConnectWalletButton() {
  const { toast } = useToast(); // 初始化 toast 实例
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false); // 用于管理连接状态
  const [connectorType, setConnectorType] = useState<'metamask' | 'walletconnect'>('metamask');
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [hasInjectedWallet, setHasInjectedWallet] = useState(false);

  const { balance, symbol, decimals, isLoading, error: usdtHookError, refetch } = useUSDTBalanceAndAllowance();

  // 监听 MetaMask 账户和网络变化
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
      return;
    }

    const ethereum = window.ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null);
        setIsConnected(false);
      } else {
        setAddress(accounts[0].toLowerCase());
        setIsConnected(true);
      }
      refetch(); // 账户变化时刷新USDT数据
    };

    const handleChainChanged = (newChainId: string) => {
      setChainId(Number(BigInt(newChainId))); // BigInt(newChainId) 转换成数字
      refetch(); // 链ID变化时刷新USDT数据
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    // 初始加载时检查连接状态
    ethereum.request({ method: 'eth_accounts' })
      .then(handleAccountsChanged)
      .catch(console.error);

    ethereum.request({ method: 'eth_chainId' })
      .then((currentChainId: string) => setChainId(Number(BigInt(currentChainId))))
      .catch(console.error);


    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [refetch]);

  // 检测设备和钱包注入
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 检测移动设备
    const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobileDevice(mobileCheck);
    
    // 检测注入的钱包
    const hasInjected = typeof window.ethereum !== 'undefined';
    setHasInjectedWallet(hasInjected);
    
    // 如果没有注入的钱包且是移动设备，默认使用 WalletConnect
    if (mobileCheck && !hasInjected) {
      setConnectorType('walletconnect');
    }
  }, []);

  const handleConnectWallet = useCallback(async (walletType?: 'metamask' | 'walletconnect') => {
    setIsConnecting(true);
    
    // Determine wallet type automatically if not specified
    const walletToUse = walletType || (typeof window !== 'undefined' && window.ethereum ? 'metamask' : 'walletconnect');
    
    try {
      let signer;
      
      if (walletToUse === 'metamask') {
        // Use MetaMask/Injected wallet
        signer = await getEthersSigner(toast);
      } else {
        // Use WalletConnect
        const provider = await connectWalletConnect();
        signer = await provider.getSigner();
        
        toast({
          title: 'WalletConnect 已连接',
          description: '通过 WalletConnect 连接成功',
          variant: 'default'
        });
      }
      
      if (signer) {
        const connectedAddress = await signer.getAddress();
        const network = await signer.provider.getNetwork();
        setAddress(connectedAddress.toLowerCase());
        setIsConnected(true);
        setChainId(Number(network.chainId));
        setConnectorType(walletToUse);
        refetch(); // 成功连接后刷新USDT数据
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
      toast({
        title: '连接失败',
        description: error instanceof Error ? error.message : '无法连接钱包，请重试',
        variant: 'destructive'
      });
    } finally {
      setIsConnecting(false);
    }
  }, [refetch, toast]);

  // 断开连接功能，支持 MetaMask 和 WalletConnect
  const handleDisconnect = async () => {
    console.log("Disconnecting wallet...");
    
    if (connectorType === 'walletconnect') {
      try {
        await disconnectWalletConnect();
        console.log("WalletConnect disconnected successfully.");
      } catch (error) {
        console.error("Failed to disconnect WalletConnect:", error);
      }
    } else if (window.ethereum && window.ethereum.request) {
      // MetaMask 断开连接
      try {
        await window.ethereum.request({ 
          method: 'wallet_revokePermissions', 
          params: [{ eth_accounts: {} }] 
        });
        console.log("MetaMask permissions revoked.");
      } catch (error) {
        console.error("Failed to revoke MetaMask permissions:", error);
        // 即使权限撤销失败，也清除本地状态
      }
    }
    
    // 清除本地状态
    setAddress(null);
    setIsConnected(false);
    setChainId(null);
    refetch();
    console.log("Wallet disconnected.");
  };


  // 钱包选择器模态框
  const WalletSelector = () => (
    <div className="absolute top-full mt-2 right-0 z-50 animate-in slide-in-from-top-2 fade-in">
      <div className="liquid-wave glass-morphism rounded-2xl border border-white/10 shadow-2xl w-64 overflow-hidden backdrop-blur-xl bg-black/80 gradient-border">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <h3 className="font-bold text-white text-sm">选择钱包连接方式</h3>
          <p className="text-xs text-white/60 mt-1">选择适合你的钱包连接方式</p>
        </div>
        
        {/* Wallet Options */}
        <div className="p-3 space-y-2">
          {/* MetaMask / Browser Extension */}
          <button
            onClick={() => {
              handleConnectWallet('metamask');
              setShowWalletSelector(false);
            }}
            disabled={isConnecting}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/30 transition-all duration-300 group hover-lift click-feedback relative"
          >
            {!isMobileDevice && hasInjectedWallet && (
              <div className="absolute -top-2 -right-2 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full border border-white/20">
                推荐
              </div>
            )}
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Wallet className="h-5 w-5 text-orange-400" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium text-white text-sm">浏览器钱包</p>
              <p className="text-xs text-white/50">MetaMask, Rabby 等</p>
            </div>
            <div className="text-xs text-white/40 group-hover:text-primary transition-colors">
              →
            </div>
          </button>
          
          {/* WalletConnect (Mobile) */}
          <button
            onClick={() => {
              handleConnectWallet('walletconnect');
              setShowWalletSelector(false);
            }}
            disabled={isConnecting}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 transition-all duration-300 group hover-lift click-feedback relative"
          >
            {isMobileDevice && !hasInjectedWallet && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full border border-white/20">
                推荐
              </div>
            )}
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Smartphone className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium text-white text-sm">移动端钱包</p>
              <p className="text-xs text-white/50">WalletConnect 支持</p>
            </div>
            <div className="text-xs text-white/40 group-hover:text-blue-400 transition-colors">
              →
            </div>
          </button>
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-black/40">
          <p className="text-xs text-white/40 text-center">
            首次连接？确保钱包已安装
          </p>
        </div>
      </div>
    </div>
  );

  if (!isConnected) {
    return (
      <div className="relative">
        <Button 
          onClick={() => setShowWalletSelector(!showWalletSelector)}
          disabled={isConnecting}
          className="relative overflow-hidden group btn-liquid glass-morphism hover-lift text-base md:text-lg font-bold px-6 md:px-8 py-3 md:py-4 rounded-full shadow-2xl bg-gradient-to-r from-primary via-purple-600 to-secondary text-white hover:shadow-[0_0_40px_rgba(255,0,255,0.7)] transition-all duration-500 hover:scale-105"
        >
          {/* 光泽动画效果 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          
          {/* 脉冲光环 */}
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          {/* 内容 */}
          <div className="relative flex items-center gap-2">
            {isConnecting ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Wallet className="h-5 w-5 mr-2" />
            )}
            <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {isConnecting ? '连接中...' : '连接钱包'}
            </span>
          </div>
        </Button>
        
        {showWalletSelector && <WalletSelector />}
      </div>
    );
  }

  // 如果已连接，显示账户地址和USDT余额
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative group overflow-hidden btn-liquid glass-morphism hover-lift h-10 w-fit rounded-full bg-gradient-to-r from-primary/30 via-purple-600/30 to-secondary/30 hover:from-primary/40 hover:via-purple-600/40 hover:to-secondary/40 transition-all duration-500 px-4 border border-white/20 hover:border-white/40 shadow-lg hover:shadow-[0_0_25px_rgba(255,0,255,0.4)]"
        >
          {/* 动态光泽效果 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          
          <div className="relative flex items-center gap-2">
            <div className="relative">
              <Wallet className="h-4 w-4 mr-2" />
              <div className="absolute -inset-1 bg-primary/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">
                {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '连接中...'}
              </span>
              <div className={cn(
                "w-2 h-2 rounded-full",
                connectorType === 'metamask' ? "bg-green-400" : "bg-blue-400",
                "animate-pulse"
              )} />
            </div>
            
            {isLoading ? (
              <span className="ml-2 text-xs text-white/60 animate-pulse">加载中...</span>
            ) : usdtHookError ? (
              <span className="ml-2 text-xs text-red-400">错误</span>
            ) : balance !== null && decimals !== null ? (
              <span className="ml-2 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full border border-green-500/30">
                {parseFloat(formatUnits(balance, decimals)).toFixed(2)} {symbol || 'USDT'}
              </span>
            ) : null}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-56 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        align="end" 
        forceMount
      >
        {/* 菜单头部 */}
        <div className="px-3 py-3 border-b border-white/10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-mono text-white/50 uppercase tracking-wider">Connected Wallet</p>
            <span className={cn(
              "text-xs px-2 py-1 rounded-full",
              connectorType === 'metamask' 
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" 
                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
            )}>
              {connectorType === 'metamask' ? 'MetaMask' : 'WalletConnect'}
            </span>
          </div>
          <p className="text-sm font-bold text-white truncate">{address}</p>
          {balance !== null && decimals !== null && (
            <p className="text-xs text-green-400 mt-1">
              {parseFloat(formatUnits(balance, decimals)).toFixed(2)} {symbol || 'USDT'} Available
            </p>
          )}
        </div>
        
        <div className="p-2">
          <DropdownMenuItem 
            onClick={handleConnectWallet}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer focus:bg-white/10"
          >
            <div className="p-1.5 bg-primary/20 rounded-lg">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <span className="text-white">刷新连接/切换</span>
          </DropdownMenuItem>
          
          {chainId && chainId !== REQUIRED_CHAIN_ID && (
            <DropdownMenuItem 
              onClick={() => connectToChain(REQUIRED_CHAIN_ID, toast)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer focus:bg-white/10"
            >
              <div className="p-1.5 bg-red-500/20 rounded-lg">
                <Diamond className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <span className="text-white block">切换到 Base Testnet</span>
                <span className="text-xs text-red-400">链不匹配</span>
              </div>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem 
            onClick={() => window.location.href = '/account/wallet'}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer focus:bg-white/10"
          >
            <div className="p-1.5 bg-purple-500/20 rounded-lg">
              <Diamond className="h-4 w-4 text-purple-400" />
            </div>
            <span className="text-white">我的钱包</span>
          </DropdownMenuItem>
          
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />
          
          <DropdownMenuItem 
            onClick={handleDisconnect}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer focus:bg-red-500/10 text-red-400"
          >
            <div className="p-1.5 bg-red-500/20 rounded-lg">
              <LogOut className="h-4 w-4" />
            </div>
            <span>断开连接</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}