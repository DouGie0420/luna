// G:\Luna Website\src\hooks\useUSDTBalanceAndAllowance.ts
import { useState, useEffect, useCallback, useRef } from 'react'; // 引入 useRef
import { ethers, Contract, BigNumberish } from 'ethers';
import USDT_ABI from '@/contracts/USDT_ABI.json'; // 引入 USDT ABI
import { getEthersProvider } from '@/lib/web3-provider'; // 引入我们自己的 getEthersProvider

// ✅ 修复 1：去掉写死的 Base 主网地址。如果 .env 里没有或被注释掉，就默认为空字符串。
const USDT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS || "";
const ESCROW_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_ESCROW_ADDRESS || "0x5CcD28825df05AEAf6F55b62c9a35695B070740F";

interface USDTBalanceAndAllowance {
  balance: BigNumberish | null;
  allowance: BigNumberish | null;
  decimals: number | null;
  symbol: string | null;
  isConnected: boolean; // 新增 isConnected
  address: string | null; // 新增 address
  chainId: number | null; // 新增 chainId
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * React Hook 用于获取用户的 USDT 余额和 Luna 托管合约的 USDT 授权额度。
 * （如果未配置 USDT 地址，则降级为只提供钱包连接状态的 Hook，适用于原生 ETH 支付）
 * * @returns {USDTBalanceAndAllowance} 包含余额、授权额度、代币小数位、符号、连接状态、地址、链ID、加载状态、错误信息和刷新函数。
 */
export function useUSDTBalanceAndAllowance(): USDTBalanceAndAllowance {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number | null>(null);

  const [balance, setBalance] = useState<BigNumberish | null>(null);
  const [allowance, setAllowance] = useState<BigNumberish | null>(null);
  const [decimals, setDecimals] = useState<number | null>(null);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const isMounted = useRef(true); // 用于防止在组件卸载后更新状态

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  // 监听 MetaMask 账户和网络变化
  useEffect(() => {
    isMounted.current = true;
    if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
      setIsConnected(false);
      setAddress(null);
      setChainId(null);
      return;
    }

    const ethereum = window.ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (isMounted.current) {
        if (accounts.length === 0) {
          setAddress(null);
          setIsConnected(false);
        } else {
          setAddress(accounts[0].toLowerCase());
          setIsConnected(true);
        }
        setRefetchTrigger(prev => prev + 1); // 账户变化时触发数据刷新
      }
    };

    const handleChainChanged = (newChainId: string) => {
      if (isMounted.current) {
        setChainId(Number(ethers.toBigInt(newChainId)));
        setRefetchTrigger(prev => prev + 1); // 链ID变化时触发数据刷新
      }
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    // 初始加载时检查连接状态
    ethereum.request({ method: 'eth_accounts' })
      .then(handleAccountsChanged)
      .catch((err: any) => {
        console.error(err);
        if (isMounted.current) setError(`钱包账户检测失败: ${err.message || err.toString()}`);
      });

    ethereum.request({ method: 'eth_chainId' })
      .then((currentChainId: string) => {
        if (isMounted.current) {
          setChainId(Number(ethers.toBigInt(currentChainId)));
        }
      })
      .catch(console.error);

    return () => {
      isMounted.current = false;
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []); // 依赖项为空，只在组件挂载时注册一次

  useEffect(() => {
    const fetchUSDTData = async () => {
      if (!isMounted.current) return;

      setIsLoading(true);
      setError(null);
      setBalance(null);
      setAllowance(null);

      if (!isConnected || !address || chainId === null) {
        // 如果未连接或缺少必要信息，不尝试获取USDT数据
        setIsLoading(false);
        return;
      }

      // ✅ 修复 2：如果 USDT 地址为空，说明当前是“原生 ETH 模式”，直接结束加载，不报任何错！
      if (!USDT_CONTRACT_ADDRESS) {
        if (isMounted.current) {
          setIsLoading(false);
          setError(null);
        }
        return;
      }

      if (!ESCROW_CONTRACT_ADDRESS) {
        if (isMounted.current) {
          setError('Missing Escrow contract address in environment variables.');
          setIsLoading(false);
        }
        return;
      }

      try {
        const provider = await getEthersProvider();
        if (!provider) {
            if (isMounted.current) setError('Web3 provider not found.');
            if (isMounted.current) setIsLoading(false);
            return;
        }
        
        const usdtContract = new Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, provider);

        // 获取代币小数位和符号（通常只需要获取一次）
        if (decimals === null) {
          const fetchedDecimals = await usdtContract.decimals();
          if (isMounted.current) setDecimals(Number(fetchedDecimals));
        }
        if (symbol === null) {
          const fetchedSymbol = await usdtContract.symbol();
          if (isMounted.current) setSymbol(fetchedSymbol);
        }

        // 获取余额
        const userBalance = await usdtContract.balanceOf(address);
        if (isMounted.current) setBalance(userBalance);

        // 获取授权额度
        const userAllowance = await usdtContract.allowance(address, ESCROW_CONTRACT_ADDRESS);
        if (isMounted.current) setAllowance(userAllowance);

      } catch (err: any) {
        console.error('Failed to fetch USDT data:', err);
        if (isMounted.current) setError(`Failed to fetch USDT data: ${err.message || err.toString()}`);
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    };

    fetchUSDTData();
  }, [address, chainId, isConnected, refetchTrigger, decimals, symbol]); 

  return { balance, allowance, decimals, symbol, isConnected, address, chainId, isLoading, error, refetch };
}