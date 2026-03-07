'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UDirectoryPage() {
    const router = useRouter();
    useEffect(() => {
        // 🚀 核心逻辑：只要路径是 /u，强制闪回首页，避免 404
        router.replace('/');
    }, [router]);
    return null;
}