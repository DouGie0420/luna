// G:\Luna Website\src\lib\firebase-functions-web3.ts
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseClientApp } from '@/firebase/client'; // 假设您有这样一个函数来获取Firebase客户端应用实例
import { FirebaseApp } from 'firebase/app'; // 引入 FirebaseApp 类型

// 获取 Firebase 客户端应用实例
// 这里的 getFirebaseClientApp 需要确保它能返回一个 FirebaseApp 实例。
// 鉴于您之前在 layout.tsx 中使用了 FirebaseClientProvider，
// 假定有一个 getFirebaseClientApp 函数可以安全地获取已初始化的客户端App。
// 如果没有，这可能需要一个单独的初始化文件或上下文来提供。
let app: FirebaseApp;
try {
  app = getFirebaseClientApp();
} catch (e) {
  console.error("Firebase client app not initialized:", e);
  // 在非SSR环境或确保app已初始化后，才能安全地获取functions实例
  // 暂时设置为 null，并在需要时进行检查
  app = null as any; 
}


const functionsInstance = app ? getFunctions(app, 'asia-east1') : null; // 指定函数部署的区域

interface CreateEscrowOrderParams {
    productId: string;
    sellerId: string;
    buyerId: string; // 应该是当前认证用户的UID
    amount: string; // BigNumberish 的字符串表示，已处理小数位
}

interface CreateEscrowOrderResult {
    success: boolean;
    escrowOrderId: string;
    transactionHash: string;
}

/**
 * 调用 Firebase Cloud Function 'createEscrowOrder' 来在链上创建 USDT 托管订单。
 * @param params 订单参数 (productId, sellerId, buyerId, amount)
 * @returns 包含成功状态、escrowOrderId 和 transactionHash 的结果。
 */
export const callCreateEscrowOrder = functionsInstance 
    ? httpsCallable<CreateEscrowOrderParams, CreateEscrowOrderResult>(functionsInstance, 'createEscrowOrder')
    : async () => { throw new Error("Firebase Functions client not initialized. Ensure FirebaseClientApp is available."); };