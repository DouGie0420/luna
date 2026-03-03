import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
// 🚀 1. 在這裡新增引入 initializeFirestore
import { getFirestore, initializeFirestore, type Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { firebaseConfig } from './config';

// 导入现有的 provider 和 hooks
import { FirebaseProvider, useFirebase, useFirebaseApp, useAuth as useAuthProvider, useFirestore } from './provider';
import { FirebaseClientProvider } from './client-provider';
import { useCollection } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';

// 注意：这里我们对 useUser 进行增强，确保它能读到 Firestore 的 role
import { useUser } from './auth/use-user';

let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

function initializeFirebase(): { app: FirebaseApp; auth: Auth; firestore: Firestore } {
  // 如果已经初始化，直接返回现有实例
  if (firebaseApp && auth && firestore) {
    console.log('Firebase already initialized, reusing existing instances');
    return { app: firebaseApp, auth, firestore };
  }

  try {
    if (getApps().length === 0) {
      console.log('Initializing Firebase app...');
      firebaseApp = initializeApp(firebaseConfig);
      auth = getAuth(firebaseApp);

      // 🚀 2. 核心修復：強制使用輪詢模式繞過 WebChannel 404 報錯
      firestore = initializeFirestore(firebaseApp, {
        experimentalAutoDetectLongPolling: true
      });

      // ✅ 在 Firestore 實例化後立即開啟持久化
      // 僅在客戶端（瀏覽器）環境下執行
      if (typeof window !== 'undefined') {
        enableIndexedDbPersistence(firestore).catch((err) => {
          if (err.code === 'failed-precondition') {
            // 多個標籤頁同時打開，僅第一個標籤頁能開啟成功
            console.warn("Luna Persistence: Multiple tabs detected. Cache active in primary tab.");
          } else if (err.code === 'unimplemented') {
            // 瀏覽器不支持（如極舊版本或某些隱身模式）
            console.error("Luna Persistence: Browser does not support storage.");
          }
        });
      }

      console.log('Firebase initialized successfully');
    } else {
      console.log('Firebase app already exists, getting existing instances');
      firebaseApp = getApps()[0];
      auth = getAuth(firebaseApp);
      // 熱更新時，直接獲取已經初始化的實例
      firestore = getFirestore(firebaseApp);
    }

    // 确保所有实例都已正确获取
    if (!firebaseApp || !auth || !firestore) {
      throw new Error('Failed to initialize Firebase: One or more instances are null');
    }

    return { app: firebaseApp, auth, firestore };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
  }
}

// 统一导出
export {
  initializeFirebase,
  FirebaseProvider,
  FirebaseClientProvider,
  useCollection,
  useDoc,
  useUser,        // 返回 { user, profile, loading, signOut }
  useFirebase,
  useFirebaseApp,
  useAuthProvider as useAuth,
  useFirestore,
};
