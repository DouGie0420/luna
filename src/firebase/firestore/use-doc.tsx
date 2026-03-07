'use client';

import { useState, useEffect, useRef } from 'react';
import {
  doc,
  onSnapshot,
  DocumentReference,
  DocumentData,
  FirestoreError,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { mockAddresses } from '@/lib/data';

const TEST_USER_ID = 'test-user-uid';

export function useDoc<T>(ref: DocumentReference<DocumentData> | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<FirestoreError | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 熔断追踪器：记录更新频率和最后更新时间
  const updateCount = useRef(0);
  const lastUpdateTime = useRef(Date.now());

  const path = ref?.path;

  useEffect(() => {
    if (!ref) {
      setData(null);
      setLoading(false);
      return;
    }

    if (ref.path.startsWith(`users/${TEST_USER_ID}/addresses/`)) {
      const addressId = ref.id;
      const mockAddress = mockAddresses.find(addr => addr.id === addressId);
      setData(mockAddress as T | null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      ref,
      (doc) => {
        // === 🛡️ 熔断与追踪逻辑开始 ===
        const now = Date.now();
        // 如果两次数据更新的间隔小于 150 毫秒（极度异常）
        if (now - lastUpdateTime.current < 150) { 
          updateCount.current += 1;
        } else {
          updateCount.current = 0; // 间隔正常，重置计数
        }
        lastUpdateTime.current = now;

        if (updateCount.current > 10) {
          console.error("🔥 [精准抓捕] 发现疯狂触发死循环的文档路径:", ref.path);
          return; // 💥 强制拉闸！阻止 React 更新，防止红屏崩溃
        }
        // === 🛡️ 熔断与追踪逻辑结束 ===

        if (doc.exists()) {
          setData({ id: doc.id, ...doc.data() } as T);
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        const permissionError = new FirestorePermissionError({
          path: ref.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);

        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [path]);

  return { data, error, loading };
}