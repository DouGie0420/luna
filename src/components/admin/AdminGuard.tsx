'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { canAccessAdmin } from '@/lib/types';
import type { UserRole } from '@/lib/types';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/auth/signin');
      return;
    }

    const checkAdminAccess = async () => {
      try {
        const userDoc = await getDoc(doc(firestore!, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role as UserRole;
          
          // 检查是否可以访问管理后台
          if (canAccessAdmin(role)) {
            setUserRole(role);
          } else {
            // 不是管理员，跳转到首页
            router.push('/');
          }
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking admin access:', error);
        router.push('/');
      } finally {
        setChecking(false);
      }
    };

    checkAdminAccess();
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

  if (!userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <Card className="glass-morphism border-red-500/30 p-8 text-center bg-red-500/5">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-white/60 mb-6">You don't have permission to access the admin panel.</p>
          <p className="text-sm text-white/40">Required role: admin, ghost, staff, or support</p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
