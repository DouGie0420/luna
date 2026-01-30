'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  startAt,
  doc,
  collection,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Query,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function useCollection<T>(q: Query<DocumentData> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [error, setError] = useState<FirestoreError | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot: QuerySnapshot) => {
        const data: T[] = [];
        querySnapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as unknown as T);
        });
        setData(data);
        setLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        const permissionError = new FirestorePermissionError({
          path: q.path,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);

        setError(err);
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [q]);

  return { data, error, loading };
}
