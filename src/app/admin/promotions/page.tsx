// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Megaphone,
  Award,
  Newspaper,
  Image as ImageIcon,
  Video as VideoIcon,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  Save,
  Settings as SettingsIcon,
  Activity,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';

interface PaymentSettings {
  usdtEnabled: boolean;
  creditCardEnabled: boolean;
  paypalEnabled: boolean;
  alipayEnabled: boolean;
}

interface CarouselItem {
  title: string;
  desc: string;
  img: string;
  link: string;
  enabled: boolean;
}

const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  usdtEnabled: true,
  creditCardEnabled: false,
  paypalEnabled: false,
  alipayEnabled: false,
};

const EMPTY_CAROUSEL_ITEM: CarouselItem = {
  title: '',
  desc: '',
  img: '',
  link: '',
  enabled: true,
};

const normalizeCarouselItem = (raw?: any): CarouselItem => ({
  title: raw?.title || '',
  desc: raw?.desc || raw?.description || '',
  img: raw?.img || raw?.imageUrl || '',
  link: raw?.link || '',
  enabled: raw?.enabled !== false,
});

export default function AdminPromotionsPage() {
  const { profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const canManageAds = Boolean(profile && ['admin', 'ghost', 'staff'].includes(profile.role || ''));
  const canManagePayments = Boolean(profile && profile.role === 'admin');

  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);
  const [isLoadingAnnouncement, setIsLoadingAnnouncement] = useState(true);

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [isLoadingPayment, setIsLoadingPayment] = useState(true);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const [carouselCount, setCarouselCount] = useState('10');
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>(
    Array.from({ length: 20 }, () => ({ ...EMPTY_CAROUSEL_ITEM }))
  );
  const [isSavingCarousel, setIsSavingCarousel] = useState(false);

  const [fixedMerchants, setFixedMerchants] = useState<string[]>(['']);
  const [isSavingMerchants, setIsSavingMerchants] = useState(false);

  const [mediumPostIds, setMediumPostIds] = useState<string[]>(Array(10).fill(''));
  const [smallPostIds, setSmallPostIds] = useState<string[]>(Array(5).fill(''));
  const [isSavingCommunity, setIsSavingCommunity] = useState(false);

  const [mediaUrl, setMediaUrl] = useState('');
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);

  useEffect(() => {
    if (!firestore) return;

    let active = true;

    const loadConfigs = async () => {
      setIsLoadingAnnouncement(true);
      setIsLoadingPayment(true);

      try {
        const [announcementSnap, paymentSnap, merchantSnap, carouselSnap, communitySnap] = await Promise.all([
          getDoc(doc(firestore, 'announcements', 'live')),
          getDoc(doc(firestore, 'settings', 'payment')),
          getDoc(doc(firestore, 'configs', 'verified_merchants')),
          getDoc(doc(firestore, 'configs', 'home_carousel')),
          getDoc(doc(firestore, 'configs', 'community_recommendations')),
        ]);

        if (!active) return;

        if (announcementSnap.exists()) {
          const data = announcementSnap.data();
          setAnnouncementTitle(data.title || '');
          setAnnouncementContent(data.content || '');
        }

        if (paymentSnap.exists()) {
          const data = paymentSnap.data();
          setPaymentSettings({
            usdtEnabled: data.usdtEnabled ?? true,
            creditCardEnabled: data.creditCardEnabled ?? false,
            paypalEnabled: data.paypalEnabled ?? false,
            alipayEnabled: data.alipayEnabled ?? false,
          });
        } else {
          setPaymentSettings(DEFAULT_PAYMENT_SETTINGS);
        }

        if (merchantSnap.exists()) {
          const data = merchantSnap.data();
          const ids = Array.isArray(data.fixedMerchantIds) ? data.fixedMerchantIds : [];
          setFixedMerchants(ids.length > 0 ? ids : ['']);
        }

        if (carouselSnap.exists()) {
          const data = carouselSnap.data();
          const rawItems = Array.isArray(data.items) ? data.items : [];
          const normalized = rawItems.slice(0, 20).map((item: any) => normalizeCarouselItem(item));
          const fullItems = [
            ...normalized,
            ...Array.from({ length: Math.max(0, 20 - normalized.length) }, () => ({ ...EMPTY_CAROUSEL_ITEM })),
          ];
          setCarouselItems(fullItems);

          const rawCount = Number(data.count);
          const safeCount = Number.isFinite(rawCount) ? Math.min(20, Math.max(1, rawCount)) : 10;
          setCarouselCount(String(safeCount));
        }

        if (communitySnap.exists()) {
          const data = communitySnap.data();
          const medium = Array.isArray(data.mediumPostIds) ? data.mediumPostIds.slice(0, 10) : [];
          const small = Array.isArray(data.smallPostIds) ? data.smallPostIds.slice(0, 5) : [];
          setMediumPostIds([...medium, ...Array(10 - medium.length).fill('')]);
          setSmallPostIds([...small, ...Array(5 - small.length).fill('')]);
        }
      } catch (error) {
        console.error('Failed to load promotions config:', error);
        toast({
          variant: 'destructive',
          title: 'Load failed',
          description: 'Some admin data failed to load.',
        });
      } finally {
        if (active) {
          setIsLoadingAnnouncement(false);
          setIsLoadingPayment(false);
        }
      }
    };

    loadConfigs();

    return () => {
      active = false;
    };
  }, [firestore, toast]);

  const updateCarouselItem = (index: number, patch: Partial<CarouselItem>) => {
    setCarouselItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const handleDeleteCarouselSlot = (index: number) => {
    setCarouselItems((prev) => prev.map((item, i) => (i === index ? { ...EMPTY_CAROUSEL_ITEM, enabled: false } : item)));
  };

  const handleTogglePayment = (key: keyof PaymentSettings) => {
    setPaymentSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePayment = async () => {
    if (!firestore || !canManagePayments) {
      toast({
        variant: 'destructive',
        title: 'Permission denied',
        description: 'Only admin can change payment settings.',
      });
      return;
    }

    setIsSavingPayment(true);
    try {
      // 1. 保存到 Hook 监听的路径
      await setDoc(
        doc(firestore, 'settings', 'payment'),
        {
          ...paymentSettings,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 2. 🛡️ 物理清理冗余路径，确保唯一性
      await deleteDoc(doc(firestore, 'configs', 'payments')).catch(() => {});

      toast({
        title: 'Payment settings saved',
        description: 'Sync complete. The checkout page will update instantly.',
      });
    } catch (error) {
      console.error('Error saving payment settings:', error);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Failed to update payment settings.',
      });
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!firestore) return;

    setIsSubmittingAnnouncement(true);
    try {
      await setDoc(
        doc(firestore, 'announcements', 'live'),
        {
          title: announcementTitle,
          content: announcementContent,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast({ title: 'Broadcast updated' });
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not update the broadcast content.',
      });
    } finally {
      setIsSubmittingAnnouncement(false);
    }
  };

  const handleSaveCarousel = async () => {
    if (!firestore || !canManageAds) return;
    setIsSavingCarousel(true);

    try {
      const activeCount = Math.min(20, Math.max(1, Number(carouselCount) || 10));
      const cleanItems = carouselItems
        .map((item) => ({
          title: item.title.trim(),
          desc: item.desc.trim(),
          img: item.img.trim(),
          link: item.link.trim(),
          enabled: item.enabled !== false,
        }))
        .filter((item) => item.img !== '');

      await setDoc(
        doc(firestore, 'configs', 'home_carousel'),
        {
          items: cleanItems,
          count: activeCount,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const published = cleanItems.filter((item) => item.enabled !== false).length;
      toast({
        title: 'Carousel updated',
        description: `${cleanItems.length} items saved, ${published} published.`,
      });
    } catch (error) {
      console.error('Error saving carousel:', error);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not save carousel configuration.',
      });
    } finally {
      setIsSavingCarousel(false);
    }
  };

  const handleSaveMerchants = async () => {
    if (!firestore) return;
    setIsSavingMerchants(true);
    try {
      const cleanIds = fixedMerchants.map((id) => id.trim()).filter(Boolean);
      await setDoc(
        doc(firestore, 'configs', 'verified_merchants'),
        {
          fixedMerchantIds: cleanIds,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast({ title: 'Verified merchants saved' });
    } catch (error) {
      console.error('Error saving merchants:', error);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not update merchant endorsements.',
      });
    } finally {
      setIsSavingMerchants(false);
    }
  };

  const handleSaveCommunity = async () => {
    if (!firestore) return;
    setIsSavingCommunity(true);
    try {
      await setDoc(
        doc(firestore, 'configs', 'community_recommendations'),
        {
          mediumPostIds: mediumPostIds.map((id) => id.trim()).filter(Boolean),
          smallPostIds: smallPostIds.map((id) => id.trim()).filter(Boolean),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast({ title: 'Community recommendations saved' });
    } catch (error) {
      console.error('Error saving community recommendations:', error);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not update recommendation IDs.',
      });
    } finally {
      setIsSavingCommunity(false);
    }
  };

  if (!canManageAds) {
    return (
      <div className="p-20 text-center text-white/40 font-mono uppercase tracking-[0.5em]">
        Clearance Level Insufficient
      </div>
    );
  }

  const paymentRows: Array<{
    key: keyof PaymentSettings;
    title: string;
    description: string;
    comingSoon?: boolean;
  }> = [
    {
      key: 'usdtEnabled',
      title: 'USDT (TRC20)',
      description: 'Enable USDT cryptocurrency payments.',
    },
    {
      key: 'creditCardEnabled',
      title: 'Credit Card',
      description: 'Enable card payments (Visa, Mastercard, etc.).',
      comingSoon: true,
    },
    {
      key: 'paypalEnabled',
      title: 'PayPal',
      description: 'Enable PayPal payments.',
      comingSoon: true,
    },
    {
      key: 'alipayEnabled',
      title: 'Alipay',
      description: 'Enable Alipay payments.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] p-6 md:p-12 space-y-12 relative overflow-hidden">
      <div className="fixed top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />

      <header className="flex justify-between items-end mb-16 relative z-10">
        <div className="space-y-3">
          <h1 className="text-5xl font-black titanium-title italic uppercase text-white tracking-tighter">
            System <span className="text-primary">Protocols</span>
          </h1>
          <p className="text-white/30 font-mono text-xs uppercase tracking-[0.5em] flex items-center gap-3">
            <Activity className="w-4 h-4 text-green-500 animate-pulse" />
            Global Promotion And Payment Control Active
          </p>
        </div>
      </header>

      <div className="grid gap-12 relative z-10">
        <Card className="glass-morphism border-white/10 p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <SettingsIcon className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold text-white">Payment Methods</h2>
                <p className="text-white/60 text-sm">Settings UI + Promotions control now share one config.</p>
              </div>
            </div>

            <Button
              onClick={handleSavePayment}
              disabled={isSavingPayment || !canManagePayments}
              className="bg-gradient-to-r from-primary to-secondary px-6"
            >
              {isSavingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Payment
                </>
              )}
            </Button>
          </div>

          {isLoadingPayment ? (
            <div className="h-20 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {paymentRows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex-1 pr-4">
                    <h3 className="text-lg font-bold text-white mb-1">{row.title}</h3>
                    <p className="text-sm text-white/60">{row.description}</p>
                    {row.comingSoon && <p className="text-xs text-yellow-400 mt-1">Coming soon</p>}
                  </div>
                  <Switch
                    checked={paymentSettings[row.key]}
                    onCheckedChange={() => handleTogglePayment(row.key)}
                    disabled={!canManagePayments}
                  />
                </div>
              ))}
            </div>
          )}

          {!canManagePayments && (
            <p className="text-xs text-yellow-400 mt-4">Only admin role can change payment settings.</p>
          )}
        </Card>

        <Card className="bg-black/75 backdrop-blur-3xl border border-white/10 rounded-[40px]">
          <CardHeader className="border-b border-white/5 p-10">
            <CardTitle className="flex items-center gap-4 text-white uppercase italic font-black">
              <Megaphone className="text-primary w-6 h-6" /> Live Broadcast
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            {isLoadingAnnouncement ? (
              <div className="h-32 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label className="text-white/40 uppercase text-[10px] tracking-[0.3em] ml-1">Protocol Header</Label>
                    <Input
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold"
                      placeholder="Input announcement title..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/40 uppercase text-[10px] tracking-[0.3em] ml-1">
                      Data Payload (Supports HTML)
                    </Label>
                    <Textarea
                      value={announcementContent}
                      onChange={(e) => setAnnouncementContent(e.target.value)}
                      rows={6}
                      className="bg-white/5 border-white/10 rounded-2xl text-white italic"
                      placeholder="Input announcement body..."
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center gap-4 flex-wrap">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsImageDialogOpen(true)}
                      className="rounded-2xl h-12 bg-white/5 border-white/10 hover:bg-white/10 text-xs uppercase font-black"
                    >
                      <ImageIcon className="mr-2 w-4 h-4" /> Inject Img
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsVideoDialogOpen(true)}
                      className="rounded-2xl h-12 bg-white/5 border-white/10 hover:bg-white/10 text-xs uppercase font-black"
                    >
                      <VideoIcon className="mr-2 w-4 h-4" /> Inject Video
                    </Button>
                  </div>
                  <Button
                    onClick={handleSaveAnnouncement}
                    disabled={isSubmittingAnnouncement}
                    className="bg-primary text-black font-black italic rounded-2xl px-12 h-14 shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:scale-[1.02] transition-transform"
                  >
                    {isSubmittingAnnouncement ? <Loader2 className="animate-spin" /> : 'Broadcast Now'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-black/75 backdrop-blur-3xl border border-white/10 rounded-[40px]">
          <CardHeader className="border-b border-white/5 p-10 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-4 text-white uppercase italic font-black">
              <ImageIcon className="text-primary w-6 h-6" /> Hero Carousel Protocol
            </CardTitle>
            <Select value={carouselCount} onValueChange={setCarouselCount}>
              <SelectTrigger className="w-44 bg-white/5 border-white/10 rounded-xl h-10 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10 text-white">
                <SelectItem value="5">5 Active Slots</SelectItem>
                <SelectItem value="10">10 Active Slots</SelectItem>
                <SelectItem value="15">15 Active Slots</SelectItem>
                <SelectItem value="20">20 Active Slots</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-10">
            <ScrollArea className="h-[600px] pr-6 rounded-[32px] border border-white/5 p-6 bg-black/40 cyber-scrollbar">
              <Accordion type="multiple" className="w-full space-y-4">
                {carouselItems.slice(0, Number(carouselCount)).map((item, index) => (
                  <AccordionItem value={`item-${index}`} key={index} className="border-white/5 bg-white/[0.02] rounded-2xl px-6">
                    <AccordionTrigger className="text-white/60 hover:text-primary font-black italic uppercase tracking-widest py-6">
                      Slot #{index + 1}: {item.title || 'Draft'}
                    </AccordionTrigger>
                    <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase text-white/30 ml-1">Asset Title</Label>
                        <Input
                          value={item.title}
                          onChange={(e) => updateCarouselItem(index, { title: e.target.value })}
                          className="bg-black/40 border-white/10 h-12 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase text-white/30 ml-1">Source Image URL</Label>
                        <Input
                          value={item.img}
                          onChange={(e) => updateCarouselItem(index, { img: e.target.value })}
                          className="bg-black/40 border-white/10 h-12 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase text-white/30 ml-1">Target Link</Label>
                        <Input
                          value={item.link}
                          onChange={(e) => updateCarouselItem(index, { link: e.target.value })}
                          className="bg-black/40 border-white/10 h-12 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase text-white/30 ml-1">Description Metadata</Label>
                        <Input
                          value={item.desc}
                          onChange={(e) => updateCarouselItem(index, { desc: e.target.value })}
                          className="bg-black/40 border-white/10 h-12 rounded-xl"
                        />
                      </div>

                      <div className="md:col-span-2 border border-white/10 rounded-xl p-4 bg-black/30 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase text-white/70 font-black tracking-wider">Publish Slot</p>
                          <p className="text-xs text-white/40 mt-1">
                            Turn off to keep content in backend as draft without showing on homepage.
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={item.enabled}
                            onCheckedChange={(checked) => updateCarouselItem(index, { enabled: checked })}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            onClick={() => handleDeleteCarouselSlot(index)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
            <div className="flex justify-end mt-10">
              <Button
                onClick={handleSaveCarousel}
                disabled={isSavingCarousel}
                className="bg-white/5 border border-white/10 hover:bg-primary hover:text-black transition-all h-14 px-10 rounded-2xl font-black uppercase italic tracking-widest shadow-xl"
              >
                {isSavingCarousel ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2 w-5 h-5" />}
                Sync Carousel Data
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/75 backdrop-blur-3xl border border-white/10 rounded-[40px]">
          <CardHeader className="border-b border-white/5 p-10 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-4 text-white uppercase italic font-black">
                <Award className="text-primary w-6 h-6" /> Merchant Endorsement
              </CardTitle>
              <CardDescription className="text-white/40 text-xs mt-1">
                Force pin certified providers to homepage feed
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setFixedMerchants((prev) => [...prev, ''])}
              className="rounded-xl border-dashed border-primary/40 text-primary h-10 text-xs uppercase font-black"
            >
              <Plus className="mr-2 w-4 h-4" /> Add Slot
            </Button>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {fixedMerchants.map((id, i) => (
                <div key={i} className="relative group">
                  <Input
                    placeholder={`Enter UID ${i + 1}`}
                    value={id}
                    onChange={(e) => {
                      const next = [...fixedMerchants];
                      next[i] = e.target.value;
                      setFixedMerchants(next);
                    }}
                    className="h-14 bg-white/5 border-white/10 rounded-2xl pl-12 text-white font-mono text-xs"
                  />
                  <Award className="absolute left-4 top-4 w-4 h-4 text-primary/40" />
                  <button
                    onClick={() => setFixedMerchants((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 text-red-500 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSaveMerchants}
                disabled={isSavingMerchants}
                className="bg-primary text-black font-black italic rounded-2xl px-12 h-14 shadow-[0_0_30px_rgba(168,85,247,0.4)]"
              >
                {isSavingMerchants ? <Loader2 className="animate-spin" /> : 'Lock Merchant Selection'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/75 backdrop-blur-2xl border border-white/10 rounded-[40px]">
          <CardHeader className="border-b border-white/5 p-10">
            <CardTitle className="flex items-center gap-4 text-white uppercase italic font-black">
              <Newspaper className="text-primary w-6 h-6" /> Lake Of Dreams Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10 grid md:grid-cols-2 gap-16">
            <div className="space-y-6">
              <Label className="text-primary uppercase text-[10px] font-black tracking-[0.4em]">
                Medium Feed Nodes (10)
              </Label>
              <div className="grid grid-cols-1 gap-3">
                {mediumPostIds.map((id, i) => (
                  <Input
                    key={i}
                    placeholder={`Post ID ${i + 1}`}
                    value={id}
                    onChange={(e) => {
                      const next = [...mediumPostIds];
                      next[i] = e.target.value;
                      setMediumPostIds(next);
                    }}
                    className="h-10 bg-white/5 border-white/10 rounded-xl font-mono text-[10px] text-white/70"
                  />
                ))}
              </div>
            </div>
            <div className="space-y-6 flex flex-col">
              <Label className="text-primary uppercase text-[10px] font-black tracking-[0.4em]">Small Feed Nodes (5)</Label>
              <div className="grid grid-cols-1 gap-3 flex-1">
                {smallPostIds.map((id, i) => (
                  <Input
                    key={i}
                    placeholder={`Post ID ${i + 1}`}
                    value={id}
                    onChange={(e) => {
                      const next = [...smallPostIds];
                      next[i] = e.target.value;
                      setSmallPostIds(next);
                    }}
                    className="h-10 bg-white/5 border-white/10 rounded-xl font-mono text-[10px] text-white/70"
                  />
                ))}
              </div>
              <div className="pt-12">
                <Button
                  onClick={handleSaveCommunity}
                  disabled={isSavingCommunity}
                  className="w-full bg-gradient-to-r from-primary to-purple-600 text-black font-black rounded-2xl h-16 uppercase italic tracking-widest shadow-2xl"
                >
                  {isSavingCommunity ? <Loader2 className="animate-spin" /> : 'Execute Feed Sync'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="bg-black/95 border-white/10 backdrop-blur-3xl rounded-[32px] text-white">
          <DialogHeader>
            <DialogTitle className="titanium-title italic uppercase">Insert Image Node</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="https://..."
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            className="h-14 bg-white/5 border-white/10 rounded-2xl"
          />
          <DialogFooter>
            <Button
              onClick={() => {
                if (!mediaUrl.trim()) return;
                setAnnouncementContent(
                  (prev) =>
                    `${prev}\n<img src="${mediaUrl.trim()}" style="border-radius:24px;margin:20px 0;width:100%;box-shadow:0 10px 30px rgba(0,0,0,0.5)" />\n`
                );
                setIsImageDialogOpen(false);
                setMediaUrl('');
              }}
              className="bg-primary text-black font-black uppercase rounded-xl px-10"
            >
              Inject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent className="bg-black/95 border-white/10 backdrop-blur-3xl rounded-[32px] text-white">
          <DialogHeader>
            <DialogTitle className="titanium-title italic uppercase">Insert Video Node</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="https://youtube.com/embed/..."
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            className="h-14 bg-white/5 border-white/10 rounded-2xl"
          />
          <DialogFooter>
            <Button
              onClick={() => {
                if (!mediaUrl.trim()) return;
                setAnnouncementContent(
                  (prev) =>
                    `${prev}\n<iframe src="${mediaUrl.trim()}" style="width:100%;height:360px;border:0;border-radius:24px;margin:20px 0" allowfullscreen></iframe>\n`
                );
                setIsVideoDialogOpen(false);
                setMediaUrl('');
              }}
              className="bg-primary text-black font-black uppercase rounded-xl px-10"
            >
              Inject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .titanium-title {
          font-family: 'Playfair Display', serif;
          letter-spacing: -0.02em;
        }
        .cyber-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .cyber-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .cyber-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.3);
          border-radius: 4px;
        }
        .cyber-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.8);
        }
      `}</style>
    </div>
  );
}