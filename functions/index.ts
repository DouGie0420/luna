// 修复后的 functions/index.ts - 解决 TypeScript 类型错误
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { ethers } from 'ethers';
import axios from 'axios';

// 初始化Firebase Admin
admin.initializeApp();
const firestore = admin.firestore();

// Base测试网配置（使用类型断言解决TypeScript错误）
const BASE_TESTNET_RPC = (functions as any).config().base?.rpc_url || 'https://base-sepolia.public.blastapi.io';
const BASE_TESTNET_CHAIN_ID = parseInt((functions as any).config().base?.chain_id || '84531', 10);
const BASE_TESTNET_EXPLORER_API = (functions as any).config().base?.api_url || 'https://sepolia.basescan.org/api';

// 监控指定钱包地址交易函数
export const monitorBaseTestnetTransactions = (functions as any).pubsub.schedule('every 5 minutes').onRun(async (context: any) => {
  try {
    // 1. 从Firestore获取需监控的钱包地址
    const monitoredWalletsRef = firestore.collection('monitored_wallets');
    const snapshot = await monitoredWalletsRef.get();

    if (snapshot.empty) {
      console.log('无需要监控的Base测试网钱包地址');
      return null;
    }

    // 2. 初始化Base测试网提供者
    const provider = new ethers.JsonRpcProvider(BASE_TESTNET_RPC);

    // 3. 遍历每个监控的钱包地址
    for (const doc of snapshot.docs) {
      const walletData = doc.data();
      const walletAddress = walletData.address;
      const lastCheckedBlock = walletData.lastCheckedBlock || 0;

      // 获取当前最新区块
      const currentBlock = await provider.getBlockNumber();

      // 4. 查询该地址在lastCheckedBlock到currentBlock之间的交易
      // 使用Base测试网区块浏览器API查询交易
      const response = await axios.get(BASE_TESTNET_EXPLORER_API, {
        params: {
          module: 'account',
          action: 'txlist',
          address: walletAddress,
          startblock: lastCheckedBlock + 1,
          endblock: currentBlock,
          sort: 'asc'
        }
      });

      if (response.data.status === '1' && response.data.result.length > 0) {
        // 5. 处理新发现的交易
        for (const tx of response.data.result) {
          // 检查是否已记录此交易
          const existingTx = await firestore.collection('base_testnet_transactions')
            .where('hash', '==', tx.hash)
            .get();

          if (existingTx.empty) {
            // 记录新交易
            await firestore.collection('base_testnet_transactions').add({
              walletAddress: walletAddress,
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: tx.value,
              gas: tx.gas,
              gasPrice: tx.gasPrice,
              blockNumber: tx.blockNumber,
              timeStamp: new Date(parseInt(tx.timeStamp) * 1000),
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`发现新的Base测试网交易: ${tx.hash} 来自地址: ${walletAddress}`);

            // 6. 触发通知逻辑（这里可以集成FCM推送通知）
            // TODO: 实现通知发送逻辑
          }
        }
      }

      // 7. 更新最后检查的区块号
      await doc.ref.update({
        lastCheckedBlock: currentBlock,
        lastCheckedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return null;
  } catch (error) {
    console.error('监控Base测试网交易时发生错误:', error);
    return null;
  }
});
