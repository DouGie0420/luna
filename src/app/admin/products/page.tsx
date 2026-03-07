// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  Search, 
  CheckCircle, 
  XCircle, 
  Eye,
  Loader2,
  Shield,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { Product } from '@/lib/types';

export default function AdminProductsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 加载产品列表
  useEffect(() => {
    if (!firestore) return;

    const loadProducts = async () => {
      try {
        const productsRef = collection(firestore, 'products');
        const q = query(productsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        const productsList: Product[] = [];
        snapshot.forEach((doc) => {
          productsList.push({
            id: doc.id,
            ...doc.data()
          } as Product);
        });

        setProducts(productsList);
        setFilteredProducts(productsList);
      } catch (error) {
        console.error('Error loading products:', error);
        toast({
          title: 'Error',
          description: 'Failed to load products.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [firestore, toast]);

  // 筛选和搜索
  useEffect(() => {
    let filtered = products;

    // 状态筛选
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // 搜索
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [products, statusFilter, searchQuery]);

  // 审核通过
  const handleApprove = async (productId: string) => {
    if (!firestore || !user) return;

    try {
      await updateDoc(doc(firestore, 'products', productId), {
        status: 'approved',
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, status: 'approved' as const } : p
      ));

      toast({
        title: 'Approved!',
        description: 'Product has been approved and is now visible.',
      });
    } catch (error) {
      console.error('Error approving product:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve product.',
        variant: 'destructive'
      });
    }
  };

  // 审核拒绝
  const handleReject = async (productId: string) => {
    if (!firestore || !user) return;

    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    try {
      await updateDoc(doc(firestore, 'products', productId), {
        status: 'rejected',
        rejectionReason: reason,
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, status: 'rejected' as const, rejectionReason: reason } : p
      ));

      toast({
        title: 'Rejected',
        description: 'Product has been rejected.',
      });
    } catch (error) {
      console.error('Error rejecting product:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject product.',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Inactive</Badge>;
      default:
        return null;
    }
  };

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
          <h1 className="text-4xl font-bold text-gradient mb-2">Product Management</h1>
          <p className="text-white/60">Manage and review products</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-morphism border-white/10 p-4">
            <p className="text-sm text-white/60 mb-1">Total Products</p>
            <p className="text-2xl font-bold text-white">{products.length}</p>
          </Card>
          <Card className="glass-morphism border-yellow-500/30 p-4 bg-yellow-500/5">
            <p className="text-sm text-white/60 mb-1">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-400">
              {products.filter(p => p.status === 'pending').length}
            </p>
          </Card>
          <Card className="glass-morphism border-green-500/30 p-4 bg-green-500/5">
            <p className="text-sm text-white/60 mb-1">Approved</p>
            <p className="text-2xl font-bold text-green-400">
              {products.filter(p => p.status === 'approved').length}
            </p>
          </Card>
          <Card className="glass-morphism border-orange-500/30 p-4 bg-orange-500/5">
            <p className="text-sm text-white/60 mb-1">Consignment</p>
            <p className="text-2xl font-bold text-orange-400">
              {products.filter(p => p.isConsignment).length}
            </p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-morphism border-white/10 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or category..."
                className="pl-10 bg-black/40 border-white/20 text-white"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('pending')}
                size="sm"
                className="border-yellow-500/50 text-yellow-400"
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === 'approved' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('approved')}
                size="sm"
                className="border-green-500/50 text-green-400"
              >
                Approved
              </Button>
              <Button
                variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('rejected')}
                size="sm"
                className="border-red-500/50 text-red-400"
              >
                Rejected
              </Button>
            </div>
          </div>
        </Card>

        {/* Products List */}
        {filteredProducts.length === 0 ? (
          <Card className="glass-morphism border-white/10 p-12 text-center">
            <Package className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">No products found</h3>
            <p className="text-white/60">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'No products have been submitted yet'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="glass-morphism border-white/10 p-6">
                <div className="flex gap-4">
                  {/* Image */}
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-32 h-32 rounded-lg object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                      <Package className="h-12 w-12 text-white/20" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-white">{product.name}</h3>
                          {product.isConsignment && (
                            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                              <Shield className="h-3 w-3 mr-1" />
                              Consignment
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-white/60">
                          <span>{product.category}</span>
                          <span>${product.price}</span>
                        </div>
                      </div>
                      {getStatusBadge(product.status || 'approved')}
                    </div>

                    <p className="text-sm text-white/70 mb-3 line-clamp-2">
                      {product.description}
                    </p>

                    {product.status === 'rejected' && product.rejectionReason && (
                      <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
                        Reason: {product.rejectionReason}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white/60">
                        Seller ID: {product.sellerId.slice(0, 8)}...
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/products/${product.id}`}>
                          <Button variant="outline" size="sm" className="border-white/20">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>

                        {product.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => handleApprove(product.id)}
                              size="sm"
                              className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReject(product.id)}
                              size="sm"
                              className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
