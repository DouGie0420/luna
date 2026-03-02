'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  ShoppingBag, 
  Package, 
  DollarSign,
  TrendingUp,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
  pendingOrders: number;
  activeUsers: number;
}

export default function AdminDashboard() {
  const firestore = useFirestore();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    activeUsers: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const loadStats = async () => {
      try {
        // 获取用户总数
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const totalUsers = usersSnapshot.size;

        // 获取订单总数和收入
        const ordersSnapshot = await getDocs(collection(firestore, 'orders'));
        const totalOrders = ordersSnapshot.size;
        let totalRevenue = 0;
        let pendingOrders = 0;

        ordersSnapshot.forEach((doc) => {
          const order = doc.data();
          if (order.status === 'completed') {
            totalRevenue += order.price || 0;
          }
          if (order.status === 'pending_payment' || order.status === 'payment_submitted') {
            pendingOrders++;
          }
        });

        // 获取产品总数
        const productsSnapshot = await getDocs(collection(firestore, 'products'));
        const totalProducts = productsSnapshot.size;

        // 获取活跃用户数（最近30天登录）
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        let activeUsers = 0;
        usersSnapshot.forEach((doc) => {
          const user = doc.data();
          if (user.updatedAt?.toDate() > thirtyDaysAgo) {
            activeUsers++;
          }
        });

        setStats({
          totalUsers,
          totalOrders,
          totalProducts,
          totalRevenue,
          pendingOrders,
          activeUsers
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [firestore]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-2">Admin Dashboard</h1>
          <p className="text-white/60">Manage your LUNA marketplace</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Users */}
          <Card className="glass-morphism border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.totalUsers}</h3>
            <p className="text-sm text-white/60">Total Users</p>
            <p className="text-xs text-green-400 mt-2">{stats.activeUsers} active (30d)</p>
          </Card>

          {/* Total Orders */}
          <Card className="glass-morphism border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <ShoppingBag className="h-6 w-6 text-purple-400" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.totalOrders}</h3>
            <p className="text-sm text-white/60">Total Orders</p>
            <p className="text-xs text-yellow-400 mt-2">{stats.pendingOrders} pending</p>
          </Card>

          {/* Total Products */}
          <Card className="glass-morphism border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-pink-500/20 rounded-lg">
                <Package className="h-6 w-6 text-pink-400" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.totalProducts}</h3>
            <p className="text-sm text-white/60">Total Products</p>
          </Card>

          {/* Total Revenue */}
          <Card className="glass-morphism border-primary/30 p-6 bg-primary/5 md:col-span-2 lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <h3 className="text-4xl font-bold text-gradient mb-1">${stats.totalRevenue.toFixed(2)}</h3>
            <p className="text-sm text-white/60">Total Revenue (Completed Orders)</p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/users">
            <Card className="glass-morphism border-white/10 p-6 hover:border-primary/50 transition-all cursor-pointer hover-lift">
              <Users className="h-8 w-8 text-blue-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Users</h3>
              <p className="text-sm text-white/60">Manage users</p>
            </Card>
          </Link>

          <Link href="/admin/orders">
            <Card className="glass-morphism border-white/10 p-6 hover:border-primary/50 transition-all cursor-pointer hover-lift">
              <ShoppingBag className="h-8 w-8 text-purple-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Orders</h3>
              <p className="text-sm text-white/60">Manage orders</p>
            </Card>
          </Link>

          <Link href="/admin/products">
            <Card className="glass-morphism border-white/10 p-6 hover:border-primary/50 transition-all cursor-pointer hover-lift">
              <Package className="h-8 w-8 text-pink-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Products</h3>
              <p className="text-sm text-white/60">Manage products</p>
            </Card>
          </Link>

          <Link href="/admin/settings">
            <Card className="glass-morphism border-white/10 p-6 hover:border-primary/50 transition-all cursor-pointer hover-lift">
              <DollarSign className="h-8 w-8 text-green-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Settings</h3>
              <p className="text-sm text-white/60">System settings</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
