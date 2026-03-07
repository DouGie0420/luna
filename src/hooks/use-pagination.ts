// src/hooks/use-pagination.ts
import { useState, useCallback } from 'react';
import { query, collection, where, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { Firestore } from "firebase/firestore";

const PAGE_SIZE = 50; // 嚴格執行你要求的分頁限額

export function usePagination<T>(db: Firestore | null, collectionName: string, queryConstraints: any[]) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const fetchInitial = useCallback(async () => {
        if (!db) return;
        setLoading(true);
        try {
            const q = query(collection(db, collectionName), ...queryConstraints, orderBy("createdAt", "desc"), limit(PAGE_SIZE));
            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
            setData(items);
            setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === PAGE_SIZE);
        } catch (err) {
            console.error("Pagination Error:", err);
        } finally {
            setLoading(false);
        }
    }, [db, collectionName, JSON.stringify(queryConstraints)]);

    const fetchMore = useCallback(async () => {
        if (!db || !lastVisible || loadingMore) return;
        setLoadingMore(true);
        try {
            const q = query(collection(db, collectionName), ...queryConstraints, orderBy("createdAt", "desc"), startAfter(lastVisible), limit(PAGE_SIZE));
            const snapshot = await getDocs(q);
            const newItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
            setData(prev => [...prev, ...newItems]);
            setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === PAGE_SIZE);
        } finally {
            setLoadingMore(false);
        }
    }, [db, lastVisible, loadingMore, collectionName, JSON.stringify(queryConstraints)]);

    return { data, loading, loadingMore, hasMore, fetchInitial, fetchMore, setData };
}