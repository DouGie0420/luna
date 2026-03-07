'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import type { PaymentMethod } from './PaymentMethodSelector'; 
import { Loader2, ShoppingBag, MapPin, Plus, ChevronRight, Check, ChevronDown } from 'lucide-react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { AddressForm } from '@/components/address-form';
import { cn } from '@/lib/utils';

interface OrderConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    sellerId: string;
  };
  onConfirm: (paymentMethod: PaymentMethod, addressId?: string) => Promise<void>;
}

export function OrderConfirmDialog({
  open,
  onOpenChange,
  product,
  onConfirm
}: OrderConfirmDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('usdt');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isAddressListOpen, setIsAddressListOpen] = useState(false); // 馃殌 鎺у埗鍦板潃鍒楄〃灞曢枊
  
  const addressesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'addresses'));
  }, [firestore, user]);

  const { data: addresses, loading: loadingAddresses } = useCollection<any>(addressesQuery);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  useEffect(() => {
    if (addresses?.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find((a: any) => a.isDefault) || addresses[0];
      setSelectedAddressId(defaultAddr.id);
    }
  }, [addresses, selectedAddressId]);

  const currentAddress = useMemo(() => 
    addresses?.find((a: any) => a.id === selectedAddressId), 
    [addresses, selectedAddressId]
  );

  const handleConfirm = async () => {
    if (!selectedAddressId) {
      alert("Please select a shipping address.");
      return;
    }
    setIsProcessing(true);
    try {
      await onConfirm(selectedMethod, selectedAddressId);
      onOpenChange(false);
    } catch (error) {
      console.error('Error confirming order:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-morphism bg-black/75 backdrop-blur-3xl border border-white/10 text-white max-w-2xl z-[99999] p-0 sm:rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40 mix-blend-screen">
          <div className="absolute -top-[30%] -left-[20%] w-[120%] h-[120%] bg-primary/30 blur-[100px] rounded-full animate-fluid-slow" />
          <div className="absolute -bottom-[40%] -right-[20%] w-[100%] h-[100%] bg-blue-500/20 blur-[120px] rounded-full animate-fluid-medium" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 max-h-[90vh] overflow-y-auto cyber-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gradient uppercase tracking-wide">
              Execute Protocol
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* 馃殌 鍗囩礆寰岀殑鍦板潃绠＄悊鍣?*/}
            <div className="glass-morphism bg-black/40 rounded-xl border border-white/10 p-4 relative overflow-hidden transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white/60 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Shipping Destination
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); setShowAddressForm(true); }}
                  className="h-7 text-[10px] uppercase font-black bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20"
                >
                  <Plus className="w-3 h-3 mr-1" /> New
                </Button>
              </div>

              {loadingAddresses ? (
                <div className="h-12 flex items-center justify-center"><Loader2 className="animate-spin text-white/20" /></div>
              ) : currentAddress ? (
                <div className="space-y-2">
                  {/* 鐣跺墠閬镐腑鍦板潃鍗＄墖 - 榛炴搳灞曢枊鍒楄〃 */}
                  <div 
                    onClick={() => setIsAddressListOpen(!isAddressListOpen)}
                    className={cn(
                      "bg-white/5 rounded-lg p-3 border transition-all cursor-pointer group flex items-center justify-between",
                      isAddressListOpen ? "border-primary/50 bg-primary/5" : "border-white/5 hover:border-white/20"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm">
                        {currentAddress.recipientName} 
                        <span className="text-white/40 ml-2 font-normal">{currentAddress.phone}</span>
                      </p>
                      <p className="text-xs text-white/60 mt-1 line-clamp-1">
                        {currentAddress.addressLine1}, {currentAddress.city}
                      </p>
                    </div>
                    {isAddressListOpen ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-primary" />}
                  </div>

                  {/* 馃殌 灞曢枊鐨勫湴鍧€鍒楄〃 */}
                  <AnimatePresence>
                    {isAddressListOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2 pt-2 border-t border-white/5"
                      >
                        {addresses.map((addr: any) => (
                          <div 
                            key={addr.id}
                            onClick={() => { setSelectedAddressId(addr.id); setIsAddressListOpen(false); }}
                            className={cn(
                              "p-3 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between",
                              selectedAddressId === addr.id ? "bg-primary/10 border-primary/30" : "bg-black/20 border-transparent hover:bg-white/5"
                            )}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white">{addr.recipientName} <span className="text-white/40 font-normal ml-1">{addr.phone}</span></p>
                              <p className="text-[10px] text-white/50 truncate mt-0.5">{addr.addressLine1}, {addr.city}</p>
                            </div>
                            {selectedAddressId === addr.id && <Check className="w-3 h-3 text-primary shrink-0" />}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div onClick={() => setShowAddressForm(true)} className="py-6 border-2 border-dashed border-white/10 rounded-lg flex flex-col items-center cursor-pointer hover:bg-white/5 transition-all">
                  <MapPin className="w-8 h-8 text-white/10 mb-2" />
                  <p className="text-xs text-white/40 uppercase font-black">Click to add address</p>
                </div>
              )}
            </div>

            {/* 鍟嗗搧姒傝 */}
            <div className="glass-morphism bg-black/40 rounded-xl border border-white/10 p-4 flex gap-4 items-center">
              {product.imageUrl && <img src={product.imageUrl} className="w-14 h-14 rounded-lg object-cover border border-white/10" />}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white text-xs truncate">{product.name}</h4>
                <p className="text-lg font-black text-primary italic">
                  {`฿${product.price.toLocaleString()}`}
                </p>
              </div>
            </div>

            {/* 鏀粯閬告搰 */}
            <div className="glass-morphism bg-black/20 rounded-xl border border-white/5 p-4">
              <PaymentMethodSelector selectedMethod={selectedMethod} onMethodChange={setSelectedMethod} />
            </div>

            <div className="space-y-4">
              <div className="glass-morphism rounded-xl border border-primary/30 p-5 bg-gradient-to-r from-primary/10 to-transparent flex items-center justify-between">
                <span className="text-sm font-bold text-white/60 uppercase">Required</span>
                <span className="text-3xl font-black text-gradient">
                  {`฿${product.price.toLocaleString()}`}
                </span>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-14 border-white/20 bg-white/5 text-white font-bold">Abort</Button>
                <Button 
                  onClick={handleConfirm} 
                  disabled={isProcessing || !selectedAddressId}
                  className="flex-[2] h-14 bg-gradient-to-r from-primary to-secondary text-black font-black shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : 'Confirm Purchase'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showAddressForm && (
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 z-[100] bg-[#0a0a0f] p-8 cyber-scrollbar overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black italic text-primary uppercase tracking-widest">New Delivery Vector</h2>
                <Button variant="ghost" onClick={() => setShowAddressForm(false)} className="text-white/40 hover:text-white">Back</Button>
              </div>
              <AddressForm userId={user?.uid} onSuccess={() => setShowAddressForm(false)} />
            </motion.div>
          )}
        </AnimatePresence>

      </DialogContent>

      <style jsx global>{`
        @keyframes fluid-slow { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(5%, 10%) scale(1.05); } }
        @keyframes fluid-medium { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-5%, -10%) scale(1.1); } }
        .animate-fluid-slow { animation: fluid-slow 20s infinite alternate ease-in-out; }
        .animate-fluid-medium { animation: fluid-medium 15s infinite alternate ease-in-out; }
        .cyber-scrollbar::-webkit-scrollbar { width: 4px; }
        .cyber-scrollbar::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.3); border-radius: 4px; }
      `}</style>
    </Dialog>
  );
}
