// src/hooks/useEthPrice.ts
import { useState, useEffect } from 'react';

export function useEthPrice() {
    const [ethPrice, setEthPrice] = useState<number | null>(null);
    const [loadingPrice, setLoadingPrice] = useState(true);

    const fetchPrice = async () => {
        try {
            // 使用 CoinGecko 的免费 API 获取实时 ETH/USD 价格
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
            const data = await res.json();
            if (data?.ethereum?.usd) {
                setEthPrice(data.ethereum.usd);
            }
        } catch (err) {
            console.error("获取实时 ETH 汇率失败:", err);
            // 测试网降级容错：如果 API 挂了，给一个默认的近似价格以防页面崩溃
            setEthPrice(3500); 
        } finally {
            setLoadingPrice(false);
        }
    };

    useEffect(() => {
        fetchPrice();
        // 每 15 秒自动刷新一次价格
        const interval = setInterval(fetchPrice, 15000);
        return () => clearInterval(interval);
    }, []);

    return { ethPrice, loadingPrice, refetchPrice: fetchPrice };
}