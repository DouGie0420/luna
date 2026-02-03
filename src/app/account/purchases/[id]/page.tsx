'use client';

import { useFirestore, useUser } from "@/firebase";
// 修正后的引入路径
import { collection, addDoc, serverTimestamp } from "firebase/firestore"; 
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useMemo } from "react";

export default function ProductDetailPage({ product }: { product: any }) {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [isBuying, setIsBuying] = useState(false);

  const handleBuy = async () => {
    if (!user) return alert("请先登录");
    if (isBuying) return;

    setIsBuying(true);
    try {
      // 1. 构建订单数据
      const orderData = {
        productName: product.name || "LUNA 测试商品", // 对应你截图中的商品名
        amount: product.price || 100,               // 对应你截图中的 100 USDT
        buyerId: user.uid,                          // 对应你的 UID: BOs5...
        sellerId: product.ownerId || "nalrrk...",    // 对应截图中的卖家 ID
        
        // 【核心】必须存入这个，结算时才能分账给卖家
        sellerAddress: product.sellerAddress || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", 
        
        status: "paid",                             // 初始状态为已支付
        createdAt: serverTimestamp(),               // 对应截图中的时间戳
        productId: product.id || "test-id"
      };

      // 2. 写入数据库
      if (db) {
        await addDoc(collection(db, "orders"), orderData);
        // 3. 跳转到“我的购买”列表
        router.push('/account/purchases');
      }
    } catch (error) {
      console.error("购买过程出错:", error);
      alert("创建订单失败，请检查控制台");
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div className="p-4">
        {/* 这里是你原来的 UI，确保按钮绑定了 handleBuy */}
        <button 
            className="bg-primary p-4 rounded text-white"
            onClick={handleBuy} 
            disabled={isBuying}
        >
            {isBuying ? "正在处理订单..." : "立即购买 (100 USDT)"}
        </button>
    </div>
  );
}
