// @ts-nocheck
'use client';

import { useEffect, useState, useCallback, useMemo } from "react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { 
  collection, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  where, 
  serverTimestamp, 
  limit 
} from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ShoppingCart,
  AlertCircle,
  MoreHorizontal,
  Check,
  X,
  ShieldAlert,
  Handshake,
  Info,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { useTranslation } from "@/hooks/use-translation";
import type { Order, OrderStatus } from "@/lib/types"; 

// ✅ Web3 Hooks
import { useUSDTBalanceAndAllowance } from '@/hooks/useUSDTBalanceAndAllowance'; 
import { useEscrowContract } from '@/hooks/useEscrowContract';
import { connectToChain } from '@/lib/web3-provider';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose 
} from "@/components/ui/dialog"; 
import Link from "next/link"; 

const statusMap: OrderStatus[] = [
  'Pending',
  'paid', 
  'Shipped',
  'Disputed', 
  'Completed',
  'Cancelled'
];

// 🛠️ 关键修改：切换为 Base Sepolia 测试网 ID
const REQUIRED_CHAIN_ID = 84532;

const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
        case 'Completed': return 'default';
        case 'Cancelled': return 'destructive';
        case 'Disputed': return 'warning'; 
        case 'paid': return 'success'; 
        default: return 'secondary';
    }
};

export default function AdminOrdersPage() {
  const { profile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null); 
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false); 
  const [selectedOrderForDispute, setSelectedOrderForDispute] = useState<Order | null>(null); 

  // --- Web3 Hooks ---
  const { address, isConnected, chainId } = useUSDTBalanceAndAllowance(); 
  const { isInteracting: isEscrowInteracting, interactionError: escrowInteractionError, resolveDispute } = useEscrowContract();

  // 🛡️ 权限执行：admin, ghost, staff, support 均可管理 [cite: 2026-02-03]
  const hasAccess = useMemo(() => 
    profile && ['admin', 'ghost', 'staff', 'support'].includes(profile.role), 
  [profile]); 
  
  useEffect(() => {
    if (isConnected && chainId !== REQUIRED_CHAIN_ID) {
        toast({
            variant: "destructive",
            title: "NETWORK_MISMATCH",
            description: `请切换到 Base Sepolia 测试网 (Chain ID: ${REQUIRED_CHAIN_ID}) 以执行链上操作。`,
            action: (
                <Button
                    onClick={() => connectToChain(REQUIRED_CHAIN_ID, toast)}
                    className="bg-primary hover:bg-primary-dark text-white"
                >
                    切换网络
                </Button>
            )
        });
    }
  }, [isConnected, chainId, toast]);

  // 🛠️ 逻辑限制：单次查询最大获取 50 条订单记录 [cite: 2026-02-07]
  const ordersQuery = useMemo(() => {
      if (!firestore || !hasAccess) return null;
      const baseQuery = collection(firestore, 'orders');

      if (activeTab === 'all') {
          return query(baseQuery, orderBy('createdAt', 'desc'), limit(50));
      } else {
          return query(baseQuery, where('status', '==', activeTab), orderBy('createdAt', 'desc'), limit(50));
      }
  }, [firestore, hasAccess, activeTab]);

  const { data: orders, loading: dataLoading, error } = useCollection<Order>(ordersQuery);

  // Cancellation requests query
  const cancellationQuery = useMemo(() => {
    if (!firestore || !hasAccess) return null;
    return query(
      collection(firestore, 'orders'),
      where('cancellationRequested', '==', true),
      orderBy('cancellationRequestedAt', 'desc'),
      limit(50)
    );
  }, [firestore, hasAccess]);
  const { data: cancellationOrders, loading: cancelLoading } = useCollection<Order>(cancellationQuery);

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    if (!firestore || !hasAccess) return;
    setProcessingId(orderId);
    try {
        const docRef = doc(firestore, "orders", orderId);
        await updateDoc(docRef, { status: newStatus });
        toast({ title: t('admin.ordersPage.statusUpdated'), description: t('admin.ordersPage.statusUpdatedDesc', { orderId: orderId.slice(0,6), status: t(getStatusTranslationKey(newStatus), newStatus) }) });
    } catch (error) {
        toast({ 
            variant: "destructive", 
            title: t('admin.ordersPage.updateFailed'), 
            description: t('admin.ordersPage.updateFailedDesc') 
        });
    } finally {
        setProcessingId(null);
    }
  };

  const handleResolveDispute = async (releaseToSeller: boolean) => {
      if (!firestore || !selectedOrderForDispute || isEscrowInteracting) return;
      if (!isConnected || chainId !== REQUIRED_CHAIN_ID) {
          toast({ variant: "destructive", title: "Web3 错误", description: "请连接并切换到 Base 测试网。" });
          return;
      }
      if (!selectedOrderForDispute.escrowOrderId) {
          toast({ variant: "destructive", title: "合约 ID 缺失", description: "订单缺乏链上 ID，无法执行退款/释放。" });
          return;
      }

      setProcessingId(selectedOrderForDispute.id); 
      try {
          const resolveTxHash = await resolveDispute(selectedOrderForDispute.escrowOrderId, releaseToSeller);

          if (!resolveTxHash) {
              throw new Error(escrowInteractionError || "链上交易失败，请检查测试币余额。");
          }

          const newStatus: OrderStatus = releaseToSeller ? 'Completed' : 'Cancelled'; 
          await updateDoc(doc(firestore, 'orders', selectedOrderForDispute.id), { 
              status: newStatus,
              resolvedAt: serverTimestamp(),
              disputeResolvedTxHash: resolveTxHash, 
          });

          toast({ 
              title: "协议已执行", 
              description: `争议解决交易已在测试网确认。资金已${releaseToSeller ? '释放给卖家' : '退还给买家'}。` 
          });
          setIsResolveDialogOpen(false); 
          setSelectedOrderForDispute(null); 
      } catch (e: any) {
          toast({ variant: 'destructive', title: '链上交互中断', description: e.message });
      } finally {
          setProcessingId(null);
      }
  };

  if (authLoading || dataLoading || isEscrowInteracting) { 
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">正在加载测试网订单数据...</p>
      </div>
    );
  }

  if (!hasAccess) {
      return (
          <div className="flex h-[60vh] flex-col items-center justify-center gap-6 p-6 text-center">
              <ShieldAlert className="h-12 w-12 text-destructive" />
              <h2 className="text-xl font-bold text-destructive">权限不足</h2>
              <p className="text-muted-foreground">此操作仅限管理组、员工及客服。 [cite: 2026-02-03]</p>
          </div>
      );
  }

  const getStatusTranslationKey = (status: OrderStatus) => {
    const key = status.charAt(0).toLowerCase() + status.slice(1).replace(/\s/g, '');
    return `accountPurchases.status.${key}`;
  }

  return (
    <div className="space-y-6">
        <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>解决争议 (测试网): {selectedOrderForDispute?.id.slice(0, 8)}...</DialogTitle>
                    <DialogDescription>资金将根据你的裁定从托管合约中划转。</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 text-sm">
                    <p>裁定金额: {selectedOrderForDispute?.totalAmount} {selectedOrderForDispute?.currency}</p>
                    <p className="font-mono text-xs">买家: {selectedOrderForDispute?.buyerId}</p>
                    <p className="font-mono text-xs">卖家: {selectedOrderForDispute?.sellerId}</p>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost" disabled={isEscrowInteracting}>取消</Button></DialogClose>
                    <Button onClick={() => handleResolveDispute(false)} disabled={isEscrowInteracting} variant="destructive">
                        {isEscrowInteracting && processingId === selectedOrderForDispute?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
                        执行买家退款
                    </Button>
                    <Button onClick={() => handleResolveDispute(true)} disabled={isEscrowInteracting} className="bg-green-600 hover:bg-green-700 text-white">
                        {isEscrowInteracting && processingId === selectedOrderForDispute?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                        释放资金至卖家
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-yellow-500">订单管理 (TESTNET)</h1>
          <p className="text-sm text-muted-foreground">当前仅显示最新的 50 条记录 [cite: 2026-02-07]</p>
        </div>
        <Badge variant="outline" className="px-4 py-1 border-yellow-500 text-yellow-500">
          Role: {profile?.role?.toUpperCase()}
        </Badge>
      </div>

       <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                {statusMap.map(status => (
                  <TabsTrigger key={status} value={status}>{t(getStatusTranslationKey(status), status)}</TabsTrigger>
                ))}
                <TabsTrigger value="cancellations" className="relative">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-orange-400" />
                    退订申请
                    {cancellationOrders && cancellationOrders.length > 0 && (
                        <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                            {cancellationOrders.length}
                        </span>
                    )}
                </TabsTrigger>
            </TabsList>
            <Card className="mt-4 border-t-4 border-t-yellow-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> 数据同步状态: 正常</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/50">
                        <TableHead>订单详细</TableHead>
                        <TableHead>用户主体</TableHead>
                        <TableHead>金额</TableHead>
                        <TableHead>流转状态</TableHead>
                        <TableHead className="text-right">协议操作</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {!orders || orders.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground">无订单数据</TableCell></TableRow>
                        ) : (
                          orders.map((order) => (
                            <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell>
                                <p className="font-semibold">{order.productName}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">ID: {order.id.slice(0, 8)}...</p>
                                {order.escrowOrderId && (
                                    <p className="text-[9px] text-muted-foreground font-mono mt-1">
                                        Escrow: <Link href={`https://sepolia.basescan.org/address/${order.escrowOrderId}`} target="_blank" className="text-blue-500 hover:underline">
                                            {order.escrowOrderId.slice(0, 8)}...<ExternalLink className="inline-block w-2.5 h-2.5 ml-1" />
                                        </Link>
                                    </p>
                                )}
                                <p className="text-[10px] text-muted-foreground">{order.createdAt?.toDate ? format(order.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}</p>
                              </TableCell>
                              <TableCell>
                                <p className="text-[10px]">Buy: <span className="font-mono">{order.buyerId.slice(0, 8)}...</span></p>
                                <p className="text-[10px]">Sell: <span className="font-mono">{order.sellerId.slice(0, 8)}...</span></p>
                              </TableCell>
                              <TableCell className="font-medium">
                                {order?.totalAmount != null ? Number(order.totalAmount).toLocaleString() : "0"} {order.currency || 'ETH'}
                              </TableCell>
                              <TableCell><Badge variant={getStatusBadgeVariant(order.status)}>{t(getStatusTranslationKey(order.status), order.status)}</Badge></TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={processingId === order.id || isEscrowInteracting}>
                                        {(processingId === order.id || isEscrowInteracting) ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>控制台</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => router.push(`/account/sales/${order.id}`)}>
                                        <Info className="h-4 w-4 mr-2" /> 详情视图
                                    </DropdownMenuItem>
                                    {order.status === 'Disputed' && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => { setSelectedOrderForDispute(order); setIsResolveDialogOpen(true); }} disabled={!isConnected || chainId !== REQUIRED_CHAIN_ID}>
                                                <Handshake className="h-4 w-4 mr-2 text-red-500" /> 强制介入
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    <DropdownMenuSeparator />
                                     {statusMap.map(status => (
                                          <DropdownMenuItem key={status} onSelect={() => handleStatusUpdate(order.id, status)} disabled={order.status === status || isEscrowInteracting || processingId === order.id}>
                                            {t(getStatusTranslationKey(status), status)}
                                          </DropdownMenuItem>
                                        ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
            </Card>
            {/* Cancellation Requests Tab */}
            {activeTab === 'cancellations' && (
                <Card className="mt-4 border-t-4 border-t-orange-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-400">
                            <AlertTriangle className="h-5 w-5" /> 退订 & 退款申请
                        </CardTitle>
                        <CardDescription>买家发起的取消预订申请，可在此审核并执行链上退款。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {cancelLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                            </div>
                        ) : !cancellationOrders || cancellationOrders.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground">暂无退订申请</div>
                        ) : (
                            <div className="space-y-4">
                                {cancellationOrders.map((order) => (
                                    <div key={order.id} className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-bold text-white">{order.productName}</p>
                                                    {order.cancellationApproved && (
                                                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                                                            卖家已批准
                                                        </span>
                                                    )}
                                                    <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                                                </div>
                                                <p className="text-xs font-mono text-muted-foreground">订单 ID: {order.id.slice(0, 12)}...</p>
                                                <p className="text-xs text-muted-foreground">
                                                    申请时间: {order.cancellationRequestedAt?.toDate ? format(order.cancellationRequestedAt.toDate(), 'yyyy-MM-dd HH:mm') : '—'}
                                                </p>
                                                <p className="text-xs font-mono text-muted-foreground">
                                                    Buy: {order.buyerId?.slice(0, 10)}... | Sell: {order.sellerId?.slice(0, 10)}...
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right space-y-1">
                                                <p className="font-black text-lg text-orange-300">
                                                    {order.totalAmount != null ? Number(order.totalAmount).toLocaleString() : '0'} {order.currency || 'ETH'}
                                                </p>
                                                {order.escrowOrderId && (
                                                    <p className="text-[10px] font-mono text-muted-foreground">Escrow: {order.escrowOrderId.slice(0, 10)}...</p>
                                                )}
                                            </div>
                                        </div>
                                        {order.cancellationReason && (
                                            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                                <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">退订原因</p>
                                                <p className="text-sm text-white/80">{order.cancellationReason}</p>
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-3 pt-2 border-t border-white/10">
                                            {/* Execute on-chain refund (same as dispute resolution) */}
                                            {order.escrowOrderId && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    disabled={isEscrowInteracting || processingId === order.id || !isConnected || chainId !== REQUIRED_CHAIN_ID}
                                                    onClick={() => { setSelectedOrderForDispute(order); setIsResolveDialogOpen(true); }}
                                                    className="flex items-center gap-2"
                                                >
                                                    {(processingId === order.id || isEscrowInteracting) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                                    执行链上退款
                                                </Button>
                                            )}
                                            {/* Manual cancel (no escrow) */}
                                            {!order.escrowOrderId && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    disabled={processingId === order.id}
                                                    onClick={() => handleStatusUpdate(order.id, 'Cancelled')}
                                                    className="flex items-center gap-2"
                                                >
                                                    {processingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                                                    直接取消订单
                                                </Button>
                                            )}
                                            {/* Dismiss request */}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={processingId === order.id}
                                                onClick={async () => {
                                                    setProcessingId(order.id);
                                                    try {
                                                        await updateDoc(doc(firestore, 'orders', order.id), {
                                                            cancellationRequested: false,
                                                            cancellationApproved: false,
                                                            status: 'paid',
                                                        });
                                                        toast({ title: '已驳回退订申请', description: `订单 ${order.id.slice(0,8)} 继续正常流转。` });
                                                    } catch (e: any) {
                                                        toast({ variant: 'destructive', title: '操作失败', description: e.message });
                                                    } finally {
                                                        setProcessingId(null);
                                                    }
                                                }}
                                                className="flex items-center gap-2 border-white/20 text-white/60 hover:text-white"
                                            >
                                                <X className="h-3.5 w-3.5" /> 驳回申请
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => router.push(`/account/sales/${order.id}`)}
                                                className="text-white/50 hover:text-white"
                                            >
                                                <Info className="h-3.5 w-3.5 mr-1.5" /> 查看详情
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </Tabs>
    </div>
  );
}