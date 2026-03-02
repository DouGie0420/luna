'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Home, 
  Search, 
  CheckCircle, 
  XCircle, 
  Eye,
  Loader2,
  MapPin,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Rental {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  ownerName?: string;
  ownerWalletAddress?: string;
  pricePerNight: number;
  location: string;
  images?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'inactive';
  createdAt: any;
}

export default function AdminRentalsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [filteredRentals, setFilteredRentals] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 加载房源列表
  useEffect(() => {
    if (!firestore) return;

    const loadRentals = async () => {
      try {
        const rentalsSnapshot = await getDocs(collection(firestore, 'rentals'));
        const rentalsList: Rental[] = [];

        rentalsSnapshot.forEach((doc) => {
          rentalsList.push({
            id: doc.id,
            ...doc.data()
          } as Rental);
        });

        // 按创建时间排序
        rentalsList.sort((a, b) => 
          b.createdAt?.toDate?.().getTime() - a.createdAt?.toDate?.().getTime()
        );

        setRentals(rentalsList);
        setFilteredRentals(rentalsList);
      } catch (error) {
        console.error('Error loading rentals:', error);
        toast({
          title: 'Error',
          description: 'Failed to load rentals.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadRentals();
  }, [firestore, toast]);

  // 筛选和搜索
  useEffect(() => {
    let filtered = rentals;

    // 状态筛选
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // 搜索
    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRentals(filtered);
  }, [rentals, statusFilter, searchQuery]);

  // 审核房源
  const handleApprove = async (rentalId: string) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'rentals', rentalId), {
        status: 'approved',
        updatedAt: serverTimestamp()
      });

      setRentals(prev => prev.map(r =>
        r.id === rentalId ? { ...r, status: 'approved' as const } : r
      ));

      toast({
        title: 'Approved!',
        description: 'Rental has been approved.',
      });
    } catch (error) {
      console.error('Error approving rental:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve rental.',
        variant: 'destructive'
      });
    }
  };

  // 拒绝房源
  const handleReject = async (rentalId: string) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'rentals', rentalId), {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });

      setRentals(prev => prev.map(r =>
        r.id === rentalId ? { ...r, status: 'rejected' as const } : r
      ));

      toast({
        title: 'Rejected',
        description: 'Rental has been rejected.',
      });
    } catch (error) {
      console.error('Error rejecting rental:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject rental.',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejected</Badge>;
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
          <h1 className="text-4xl font-bold text-gradient mb-2">Rental Management</h1>
          <p className="text-white/60">Manage rental properties and bookings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-morphism border-white/10 p-4">
            <p className="text-sm text-white/60 mb-1">Total Rentals</p>
            <p className="text-2xl font-bold text-white">{rentals.length}</p>
          </Card>
          <Card className="glass-morphism border-yellow-500/30 p-4 bg-yellow-500/5">
            <p className="text-sm text-white/60 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-400">
              {rentals.filter(r => r.status === 'pending').length}
            </p>
          </Card>
          <Card className="glass-morphism border-green-500/30 p-4 bg-green-500/5">
            <p className="text-sm text-white/60 mb-1">Approved</p>
            <p className="text-2xl font-bold text-green-400">
              {rentals.filter(r => r.status === 'approved').length}
            </p>
          </Card>
          <Card className="glass-morphism border-red-500/30 p-4 bg-red-500/5">
            <p className="text-sm text-white/60 mb-1">Rejected</p>
            <p className="text-2xl font-bold text-red-400">
              {rentals.filter(r => r.status === 'rejected').length}
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
                placeholder="Search by title, location, or owner..."
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

        {/* Rentals List */}
        {filteredRentals.length === 0 ? (
          <Card className="glass-morphism border-white/10 p-12 text-center">
            <Home className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">No rentals found</h3>
            <p className="text-white/60">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'No rental properties have been submitted yet'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRentals.map((rental) => (
              <Card key={rental.id} className="glass-morphism border-white/10 p-6">
                <div className="flex gap-4">
                  {/* Image */}
                  {rental.images && rental.images[0] ? (
                    <img
                      src={rental.images[0]}
                      alt={rental.title}
                      className="w-32 h-32 rounded-lg object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                      <Home className="h-12 w-12 text-white/20" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{rental.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-white/60">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {rental.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${rental.pricePerNight}/night
                          </span>
                        </div>
                      </div>
                      {getStatusBadge(rental.status)}
                    </div>

                    <p className="text-sm text-white/70 mb-3 line-clamp-2">
                      {rental.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white/60">
                        Owner: {rental.ownerName || 'Unknown'}
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/rentals/${rental.id}`}>
                          <Button variant="outline" size="sm" className="border-white/20">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>

                        {rental.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => handleApprove(rental.id)}
                              size="sm"
                              className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReject(rental.id)}
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
