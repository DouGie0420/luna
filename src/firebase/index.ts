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
