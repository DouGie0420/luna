import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// 导入现有的 provider 和 hooks
import { FirebaseProvider, useFirebase, useFirebaseApp, useAuth as useAuthProvider, useFirestore } from './provider';
import { FirebaseClientProvider } from './client-provider';
import { useCollection } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';

// 注意：这里我们对 useUser 进行增强，确保它能读到 Firestore 的 role
import { useUser } from './auth/use-user';

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

function initializeFirebase() {
  if (getApps().length === 0) {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    
    // --- 【关键修复开始】 ---
    // 强制指定 authDomain 为 Firebase 默认提供的生产域名
    // 这样可以解决 Cloud Workstations 环境下 /__/auth/handler 404 的问题
    // @ts-ignore - 忽略内部配置属性的类型检查
    auth.config.authDomain = "studio-5896500485-92a21.firebaseapp.com";
    // --- 【关键修复结束】 ---

    firestore = getFirestore(firebaseApp);
  } else {
    firebaseApp = getApps()[0];
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
  }
  return { app: firebaseApp, auth, firestore };
}

// 统一导出
export {
  initializeFirebase,
  FirebaseProvider,
  FirebaseClientProvider,
  useCollection,
  useDoc,
  useUser,        // 返回 { user, profile, loading }
  useFirebase,
  useFirebaseApp,
  useAuthProvider as useAuth, 
  useFirestore,
};