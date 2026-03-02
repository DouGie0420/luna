'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/auth/signin');
      return;
    }

    const checkAdmin = async () => {
      try {
        const userDoc = await getDoc(doc(firestore!, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === 'admin' || userData.isAdmin === true) {
            setIsAdmin(true);
          } else {
            // 不是管理员，跳转到首页
            router.push('/');
          }
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking admin:', error);
        router.push('/');
      } finally {
        setChecking(false);
      }
    };

    checkAdmin();
  }, [user, loading, firestore, router]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <Card className="glass-morphism border-white/10 p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-white/60">Checking permissions...</p>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <Card className="glass-morphism border-red-500/30 p-8 text-center bg-red-500/5">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-white/60 mb-6">You don't have permission to access this page.</p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
