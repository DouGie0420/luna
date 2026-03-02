// G:\Luna Website\src\app\admin\orders\page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from "react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, getDocs, query, orderBy, doc, updateDoc, where } from "firebase/firestore";
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
import { Loader2, ShoppingCart, AlertCircle, MoreHorizontal, Check, X, ShieldAlert, Handshake } from "lucide-react"; // 新增 Check, X, ShieldAlert, Handshake
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { useTranslation } from "@/hooks/use-translation";
import type { Order, OrderStatus } from "@/lib/types"; // 确保 Order 类型包含所有 Web3 字段

// ✅ Web3 Hooks
import { useUSDTBalanceAndAllowance } from '@/hooks/useUSDTBalanceAndAllowance'; // 导入我们自己的 Hook
import { useEscrowContract } from '@/hooks/useEscrowContract';
import { connectToChain } from '@/lib/web3-provider';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"; // 导入 Dialog 相关组件
import Link from "next/link"; // 导入 Link 组件

const statusMap: OrderStatus[] = [
  'Pending',
  'paid', 
  'Shipped',
  'Disputed', 
  'Completed',
  'Cancelled'
];

// 定义Luna项目所需的Polygon链ID，与web3-provider.ts保持一致
const REQUIRED_CHAIN_ID = 8453;

const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
        case 'Completed':
             return 'default';
        case 'Cancelled':
             return 'destructive';
        case 'Disputed': 
            return 'warning'; 
        case 'paid': 
            return 'success'; 
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
  const { address, isConnected, chainId } = useUSDTBalanceAndAllowance(); // 使用我们自己的 Hook
  const { isInteracting: isEscrowInteracting, interactionError: escrowInteractionError, resolveDispute } = useEscrowContract();
  // --- End Web3 Hooks ---

  const hasAccess = useMemo(() => profile && (profile.role === 'admin' || profile.role === 'ghost'), [profile]); 
  
  useEffect(() => {
    if (isConnected && chainId !== REQUIRED_CHAIN_ID) {
        toast({
            variant: "destructive",
            title: "CHAIN_MISMATCH",
            description: `请切换到 Base 主网 (Chain ID: ${REQUIRED_CHAIN_ID}) 以执行链上操作。`,
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

  const ordersQuery = useMemo(() => {
      if (!firestore || !hasAccess) return null;

      const baseQuery = collection(firestore, 'orders');

      if (activeTab === 'all') {
          return query(baseQuery, orderBy('createdAt', 'desc'));
      } else {
          return query(baseQuery, where('status', '==', activeTab), orderBy('createdAt', 'desc'));
      }
  }, [firestore, hasAccess, activeTab]);

  const { data: orders, loading: dataLoading, error } = useCollection<Order>(ordersQuery);

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
          toast({ variant: "destructive", title: "Web3 错误", description: "请连接钱包并切换到 Base 主网。" });
          return;
      }

      if (!selectedOrderForDispute.escrowOrderId) {
          toast({ variant: "destructive", title: "合约ID缺失", description: "订单缺乏链上合约ID，无法解决争议。" });
          return;
      }

      setProcessingId(selectedOrderForDispute.id); 
      try {
          const resolveTxHash = await resolveDispute(selectedOrderForDispute.escrowOrderId, releaseToSeller);

          if (!resolveTxHash) {
              throw new Error(escrowInteractionError || "链上争议解决失败，请检查 Gas 或余额。");
          }

          const newStatus: OrderStatus = releaseToSeller ? 'Completed' : 'Cancelled'; 
          await updateDoc(doc(firestore, 'orders', selectedOrderForDispute.id), { 
              status: newStatus,
              resolvedAt: serverTimestamp(),
              disputeResolvedTxHash: resolveTxHash, 
          });

          toast({ 
              title: "争议已解决", 
              description: `订单 ${selectedOrderForDispute.id.slice(0,6)}... 已在链上解决。资金已${releaseToSeller ? '释放给卖家' : '退还给买家'}。` 
          });
          setIsResolveDialogOpen(false); 
          setSelectedOrderForDispute(null); 
      } catch (e: any) {
          console.error("争议解决失败:", e);
          toast({ variant: 'destructive', title: '协议执行失败', description: e.message || "链上争议解决中断" });
      } finally {
          setProcessingId(null);
      }
  };


  if (authLoading || dataLoading || isEscrowInteracting) { 
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">正在安全加载订单数据...</p>
      </div>
    );
  }

  if (!hasAccess) {
      return (
          <div className="flex h-[60vh] flex-col items-center justify-center gap-6 p-6 text-center">
              <ShieldAlert className="h-12 w-12 text-destructive" />
              <h2 className="text-xl font-bold text-destructive">访问被拒绝</h2>
              <p className="text-muted-foreground max-w-md">您没有足够的权限访问此管理页面。请联系管理员。</p>
          </div>
      );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold text-destructive">数据库查询失败</h2>
        <p className="text-muted-foreground max-w-md">无法按状态筛选订单。这很可能是因为缺少数据库索引。</p>
        <p className="mt-2 text-xs text-muted-foreground">请打开浏览器开发者控制台（通常是F12），找到包含 `https://console.firebase.google.com/...` 的错误信息，点击链接即可一键创建所需的索引。</p>
        <pre className="mt-4 p-4 text-xs bg-muted rounded-md text-left overflow-auto">{(error as Error).message}</pre>
        <Button onClick={() => setActiveTab('all')}>显示全部订单</Button>
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
                    <DialogTitle>解决争议订单: {selectedOrderForDispute?.id.slice(0, 8)}...</DialogTitle>
                    <DialogDescription>
                        请选择争议解决方式。这将触发链上交易。
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <p>订单金额: {selectedOrderForDispute?.totalAmount} {selectedOrderForDispute?.currency || 'USDT'}</p>
                    <p>买家: {selectedOrderForDispute?.buyerId}</p>
                    <p>卖家: {selectedOrderForDispute?.sellerId}</p>
                    {escrowInteractionError && <p className="text-red-500 text-sm">{escrowInteractionError}</p>}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="ghost" disabled={isEscrowInteracting}>取消</Button>
                    </DialogClose>
                    <Button 
                        onClick={() => handleResolveDispute(false)} 
                        disabled={isEscrowInteracting}
                        variant="destructive"
                    >
                        {isEscrowInteracting && processingId === selectedOrderForDispute?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
                        退款给买家
                    </Button>
                    <Button 
                        onClick={() => handleResolveDispute(true)} 
                        disabled={isEscrowInteracting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isEscrowInteracting && processingId === selectedOrderForDispute?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                        释放资金给卖家
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">订单管理</h1>
          <p className="text-sm text-muted-foreground">管理并查看系统所有交易记录</p>
        </div>
        <Badge variant="secondary" className="px-4 py-1">
          当前权限: {profile?.role?.toUpperCase()}
        </Badge>
      </div>
       <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                {statusMap.map(status => (
                  <TabsTrigger key={status} value={status}>
                    {t(getStatusTranslationKey(status), status)}
                  </TabsTrigger>
                ))}
            </TabsList>
            <Card className="mt-4 border-t-4 border-t-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-primary" /> 
                    订单列表 ({orders?.length || 0})
                  </CardTitle>
                  <CardDescription>当前筛选: {activeTab === 'all' ? '全部' : t(getStatusTranslationKey(activeTab), activeTab)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>订单信息</TableHead>
                          <TableHead>买家 / 卖家</TableHead>
                          <TableHead>金额</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!orders || orders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                              该状态下暂无订单记录
                            </TableCell>
                          </TableRow>
                        ) : (
                          orders.map((order) => (
                            <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell>
                                <p className="font-semibold">{order.productName}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  ID: {order.id.slice(0, 8)}...
                                </p>
                                {order.escrowOrderId && (
                                    <p className="text-[9px] text-muted-foreground font-mono mt-1">
                                        Escrow ID: <Link href={`https://polygonscan.com/address/${order.escrowOrderId}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                            {order.escrowOrderId.slice(0, 8)}...<ExternalLink className="inline-block w-2.5 h-2.5 ml-1" />
                                        </Link>
                                    </p>
                                )}
                                <p className="text-[10px] text-muted-foreground">
                                    {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}
                                </p>
                              </TableCell>
                              <TableCell>
                                <p className="text-xs">买: <span className="font-mono">{order.buyerId.slice(0, 8)}...</span></p>
                                <p className="text-xs">卖: <span className="font-mono">{order.sellerId.slice(0, 8)}...</span></p>
                              </TableCell>
                              <TableCell className="font-medium">
                                {order?.totalAmount != null 
                                  ? Number(order.totalAmount).toLocaleString() 
                                  : "0"}{" "}
                                <span className="text-[10px] text-muted-foreground">{order.currency || 'USDT'}</span>
                              </TableCell>
                              <TableCell>
                                 <Badge variant={getStatusBadgeVariant(order.status)}>
                                    {t(getStatusTranslationKey(order.status), order.status)}
                                 </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={processingId === order.id || isEscrowInteracting}>
                                        {(processingId === order.id || isEscrowInteracting) ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>订单操作</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => router.push(`/account/sales/${order.id}`)}>
                                        <Info className="h-4 w-4 mr-2" /> 查看详情
                                    </DropdownMenuItem>
                                    {order.status === 'Disputed' && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem 
                                                onClick={() => { setSelectedOrderForDispute(order); setIsResolveDialogOpen(true); }}
                                                disabled={!isConnected || chainId !== REQUIRED_CHAIN_ID}
                                            >
                                                <Handshake className="h-4 w-4 mr-2 text-red-500" /> 解决争议
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    <DropdownMenuSeparator />
                                     {statusMap.map(status => (
                                          <DropdownMenuItem 
                                            key={status} 
                                            onSelect={() => handleStatusUpdate(order.id, status)}
                                            disabled={order.status === status || isEscrowInteracting || processingId === order.id}
                                          >
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
        </Tabs>
    </div>
  );
}